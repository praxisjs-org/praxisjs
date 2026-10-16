import { describe, it, expect } from "vitest";

import { Task, Queue, Pool } from "../decorators";
import { QueueClearedError } from "../queue";

// Applies a field decorator the way the decorator runtime does: the initializer it returns
// produces the field's value on each instance.
function fieldCtx(name: string) {
  return {
    ctx: {
      name,
      kind: "field" as const,
      addInitializer() { /* unused by these decorators */ },
    } as unknown as ClassFieldDecoratorContext<Record<string, unknown>>,
    run(instance: Record<string, unknown>, init: (this: Record<string, unknown>, value?: unknown) => unknown) {
      instance[name] = init.call(instance, instance[name]);
    },
  };
}

// ── Task ──────────────────────────────────────────────────────────────────────

describe("Task decorator", () => {
  it("wraps the named method and exposes signals as sub-properties", async () => {
    const { ctx, run } = fieldCtx("taskLoad");
    const init = Task("load")(undefined, ctx);

    const instance: Record<string, unknown> = {
      load: async (x: unknown) => (x as number) * 2,
    };
    run(instance, init);

    const taskLoad = instance.taskLoad as {
      (...args: unknown[]): Promise<number>;
      loading: () => boolean;
      error: () => Error | null;
      lastResult: () => number | null;
      cancelAll: () => void;
    };

    expect(typeof taskLoad).toBe("function");
    expect(taskLoad.loading).toBeDefined();
    expect(taskLoad.error).toBeDefined();
    expect(taskLoad.lastResult).toBeDefined();
    expect(taskLoad.cancelAll).toBeDefined();

    const result = await taskLoad(5);
    expect(result).toBe(10);
    expect(taskLoad.lastResult()).toBe(10);
  });

  it("sets loading while running", async () => {
    const { ctx, run } = fieldCtx("taskFetch");
    const init = Task("fetch")(undefined, ctx);

    let resolve!: (v: string) => void;
    const instance: Record<string, unknown> = {
      fetch: async () => new Promise<string>((r) => { resolve = r; }),
    };
    run(instance, init);

    const taskFetch = instance.taskFetch as { (): Promise<string>; loading: () => boolean };
    const p = taskFetch();
    expect(taskFetch.loading()).toBe(true);
    resolve("done");
    await p;
    expect(taskFetch.loading()).toBe(false);
  });

  it("cancelAll() aborts the in-flight signal", async () => {
    const { ctx, run } = fieldCtx("taskFetch");
    const init = Task("fetch")(undefined, ctx);

    let capturedSignal!: AbortSignal;
    let resolve!: () => void;
    const instance: Record<string, unknown> = {
      fetch: async (signal: AbortSignal) => {
        capturedSignal = signal;
        await new Promise<void>((r) => { resolve = r; });
      },
    };
    run(instance, init);

    const taskFetch = instance.taskFetch as { (): Promise<void>; cancelAll: () => void };
    const p = taskFetch();
    taskFetch.cancelAll();
    resolve();
    await p;

    expect(capturedSignal.aborted).toBe(true);
  });
});

// ── Queue ─────────────────────────────────────────────────────────────────────

describe("Queue decorator", () => {
  it("wraps the named method and exposes signals", async () => {
    const { ctx, run } = fieldCtx("taskSave");
    const init = Queue("save")(undefined, ctx);

    const instance: Record<string, unknown> = {
      save: async (x: unknown) => String(x),
    };
    run(instance, init);

    const taskSave = instance.taskSave as {
      (...args: unknown[]): Promise<string>;
      loading: () => boolean;
      pending: () => number;
      error: () => Error | null;
      clear: () => void;
    };

    expect(typeof taskSave).toBe("function");
    expect(taskSave.loading).toBeDefined();
    expect(taskSave.pending).toBeDefined();
    expect(taskSave.error).toBeDefined();
    expect(taskSave.clear).toBeDefined();

    const result = await taskSave("hello");
    expect(result).toBe("hello");
  });

  it("clear() rejects queued calls with QueueClearedError", async () => {
    const { ctx, run } = fieldCtx("taskSave");
    const init = Queue("save")(undefined, ctx);

    let resolveFirst!: () => void;
    const instance: Record<string, unknown> = {
      save: async (signal: AbortSignal, _: unknown, idx: unknown) => {
        void signal;
        return idx === 0
          ? new Promise<void>((r) => { resolveFirst = r; })
          : Promise.resolve();
      },
    };
    run(instance, init);

    const taskSave = instance.taskSave as { (...args: unknown[]): Promise<unknown>; clear: () => void };
    taskSave(null, 0);
    const p1 = taskSave(null, 1);
    taskSave.clear();

    await expect(p1).rejects.toThrow("Queue cleared");
    resolveFirst();
  });
});

// ── Pool ──────────────────────────────────────────────────────────────────────

describe("Pool decorator", () => {
  it("wraps the named method and exposes signals", async () => {
    const { ctx, run } = fieldCtx("taskProcess");
    const init = Pool("process", 2)(undefined, ctx);

    const instance: Record<string, unknown> = {
      process: async (x: unknown) => (x as number) + 1,
    };
    run(instance, init);

    const taskProcess = instance.taskProcess as {
      (...args: unknown[]): Promise<number>;
      loading: () => boolean;
      active: () => number;
      pending: () => number;
      error: () => Error | null;
      cancelAll: () => void;
    };

    expect(typeof taskProcess).toBe("function");
    expect(taskProcess.loading).toBeDefined();
    expect(taskProcess.active).toBeDefined();
    expect(taskProcess.pending).toBeDefined();
    expect(taskProcess.error).toBeDefined();
    expect(taskProcess.cancelAll).toBeDefined();

    const result = await taskProcess(9);
    expect(result).toBe(10);
  });

  it("respects concurrency limit", async () => {
    const { ctx, run } = fieldCtx("taskWork");
    const init = Pool("work", 2)(undefined, ctx);

    const resolvers: Array<() => void> = [];
    const instance: Record<string, unknown> = {
      work: async () => new Promise<void>((r) => resolvers.push(r)),
    };
    run(instance, init);

    const taskWork = instance.taskWork as { (): Promise<void>; active: () => number; pending: () => number };
    const t1 = taskWork();
    const t2 = taskWork();
    taskWork();

    expect(taskWork.active()).toBe(2);
    expect(taskWork.pending()).toBe(1);

    resolvers.forEach((r) => { r(); });
    await Promise.all([t1, t2]);
  });

  it("defaults concurrency to 1", async () => {
    const { ctx, run } = fieldCtx("taskWork");
    const init = Pool("work")(undefined, ctx);

    const resolvers: Array<() => void> = [];
    const instance: Record<string, unknown> = {
      work: async () => new Promise<void>((r) => resolvers.push(r)),
    };
    run(instance, init);

    const taskWork = instance.taskWork as { (): Promise<void>; active: () => number; pending: () => number };
    const t1 = taskWork();
    const t2 = taskWork();

    expect(taskWork.active()).toBe(1);
    expect(taskWork.pending()).toBe(1);

    resolvers[0]();
    await t1;
    resolvers[1]();
    await t2;
  });

  it("cancelAll() cancels pending and active tasks", async () => {
    const { ctx, run } = fieldCtx("taskWork");
    const init = Pool("work", 1)(undefined, ctx);

    let resolveFirst!: () => void;
    const instance: Record<string, unknown> = {
      work: async (signal: AbortSignal, idx: unknown) => {
        void signal;
        if (idx === 0) await new Promise<void>((r) => { resolveFirst = r; });
      },
    };
    run(instance, init);

    const taskWork = instance.taskWork as {
      (...args: unknown[]): Promise<void>;
      active: () => number;
      pending: () => number;
      cancelAll: () => void;
    };

    const t1 = taskWork(0);
    const t2 = taskWork(1);

    await Promise.resolve();
    taskWork.cancelAll();
    resolveFirst();

    await Promise.all([t1, t2]);

    expect(taskWork.active()).toBe(0);
    expect(taskWork.pending()).toBe(0);
  });
});

// ── QueueClearedError re-export ────────────────────────────────────────────────

describe("QueueClearedError", () => {
  it("is exported from the package", () => {
    expect(QueueClearedError).toBeDefined();
    const e = new QueueClearedError();
    expect(e).toBeInstanceOf(Error);
    expect(e.name).toBe("QueueClearedError");
    expect(e.message).toBe("Queue cleared");
  });
});

// ── Real decorator syntax ─────────────────────────────────────────────────────

describe("decorators on a real class", () => {
  class Loader {
    calls = 0;
    @Task("load") loadTask!: { (id: number): Promise<number | undefined>; lastResult: () => number | null };
    @Queue("save") saveQueue!: { (id: number): Promise<number>; pending: () => number };
    @Pool("upload", 2) uploadPool!: { (id: number): Promise<number | undefined>; active: () => number };

    async load(signal: AbortSignal, id: number) { this.calls++; return signal.aborted ? -1 : id; }
    async save(id: number) { this.calls++; return id * 2; }
    async upload(id: number) { this.calls++; return id * 3; }
  }

  it("gives each instance its own bound task, queue and pool", async () => {
    const a = new Loader();
    const b = new Loader();
    expect(a.loadTask).not.toBe(b.loadTask);

    expect(await a.loadTask(1)).toBe(1);
    expect(await a.saveQueue(2)).toBe(4);
    expect(await a.uploadPool(3)).toBe(9);
    expect(a.calls).toBe(3);
    expect(b.calls).toBe(0);
    expect(a.loadTask.lastResult()).toBe(1);
    expect(b.loadTask.lastResult()).toBeNull();
  });

  it("the fields are plain writable own properties", () => {
    const inst = new Loader();
    const desc = Object.getOwnPropertyDescriptor(inst, "loadTask");
    expect(desc?.writable).toBe(true);
    expect(desc?.enumerable).toBe(true);
  });
});
