import { describe, it, expect } from "vitest";

import { Task, Queue, Pool } from "../decorators";

function methodCtx(name: string) {
  const initializers: Array<(this: unknown) => void> = [];
  return {
    ctx: {
      name,
      kind: "method" as const,
      addInitializer(fn: (this: unknown) => void) { initializers.push(fn); },
    } as ClassMethodDecoratorContext,
    run(instance: unknown) { initializers.forEach((fn) => { fn.call(instance); }); },
  };
}

// ── Task ──────────────────────────────────────────────────────────────────────

describe("Task decorator", () => {
  it("replaces method with a task runner and exposes signals", async () => {
    const { ctx, run } = methodCtx("load");
    const original = async (x: unknown) => (x as number) * 2;
    Task()(original, ctx);

    const instance: Record<string, unknown> = {};
    run(instance);

    expect(typeof instance.load).toBe("function");
    expect(instance.load_loading).toBeDefined();
    expect(instance.load_error).toBeDefined();
    expect(instance.load_lastResult).toBeDefined();

    const result = await (instance.load as (x: number) => Promise<number>)(5);
    expect(result).toBe(10);
    expect(
      (instance.load_lastResult as () => number)(),
    ).toBe(10);
  });

  it("sets loading signal while running", async () => {
    const { ctx, run } = methodCtx("fetch");
    let resolve!: (v: string) => void;
    const original = async () => new Promise<string>((r) => { resolve = r; });
    Task()(original, ctx);

    const instance: Record<string, unknown> = {};
    run(instance);

    const p = (instance.fetch as () => Promise<string>)();
    expect((instance.fetch_loading as () => boolean)()).toBe(true);
    resolve("done");
    await p;
    expect((instance.fetch_loading as () => boolean)()).toBe(false);
  });
});

// ── Queue ─────────────────────────────────────────────────────────────────────

describe("Queue decorator", () => {
  it("replaces method with a queue runner and exposes signals", async () => {
    const { ctx, run } = methodCtx("save");
    const original = async (x: unknown) => String(x);
    Queue()(original, ctx);

    const instance: Record<string, unknown> = {};
    run(instance);

    expect(typeof instance.save).toBe("function");
    expect(instance.save_loading).toBeDefined();
    expect(instance.save_pending).toBeDefined();
    expect(instance.save_error).toBeDefined();

    const result = await (instance.save as (x: string) => Promise<string>)("hello");
    expect(result).toBe("hello");
  });
});

// ── Queue (additional) ────────────────────────────────────────────────────────

describe("Queue decorator (additional)", () => {
  it("clear() is accessible on the instance via method_clear property", async () => {
    const { ctx, run } = methodCtx("save");
    let resolveFirst!: () => void;
    const original = async (_: unknown, idx: unknown) =>
      idx === 0
        ? new Promise<void>((r) => { resolveFirst = r; })
        : Promise.resolve();
    Queue()(original, ctx);

    const instance: Record<string, unknown> = {};
    run(instance);

    expect(typeof instance.save_clear).toBe("function");

    const save = instance.save as (...args: unknown[]) => Promise<unknown>;
    save(null, 0);
    const p1 = save(null, 1);

    // Call clear via the exposed property
    (instance.save_clear as () => void)();

    await expect(p1).rejects.toThrow("Queue cleared");
    resolveFirst();
  });
});

// ── Pool ──────────────────────────────────────────────────────────────────────

describe("Pool decorator", () => {
  it("replaces method with a pool runner and exposes signals", async () => {
    const { ctx, run } = methodCtx("process");
    const original = async (x: unknown) => (x as number) + 1;
    Pool(2)(original, ctx);

    const instance: Record<string, unknown> = {};
    run(instance);

    expect(typeof instance.process).toBe("function");
    expect(instance.process_loading).toBeDefined();
    expect(instance.process_active).toBeDefined();
    expect(instance.process_pending).toBeDefined();
    expect(instance.process_error).toBeDefined();

    const result = await (instance.process as (x: number) => Promise<number>)(9);
    expect(result).toBe(10);
  });

  it("respects concurrency limit", async () => {
    const { ctx, run } = methodCtx("work");
    const resolvers: Array<() => void> = [];
    const original = async () => new Promise<void>((r) => resolvers.push(r));
    Pool(2)(original, ctx);

    const instance: Record<string, unknown> = {};
    run(instance);

    const work = instance.work as () => Promise<void>;
    const t1 = work();
    const t2 = work();
    work(); // queued — concurrency limit is 2

    expect((instance.work_active as () => number)()).toBe(2);
    expect((instance.work_pending as () => number)()).toBe(1);

    resolvers.forEach((r) => { r(); });
    await Promise.all([t1, t2]);
  });

  it("Pool(-1, fn) — clamps to 1, does not allow unlimited concurrency", async () => {
    const { ctx, run } = methodCtx("work");
    const resolvers: Array<() => void> = [];
    const original = async () => new Promise<void>((r) => resolvers.push(r));
    Pool(-1)(original, ctx);

    const instance: Record<string, unknown> = {};
    run(instance);

    const work = instance.work as () => Promise<void>;
    const t1 = work();
    const t2 = work();

    // With concurrency clamped to 1, only one task should be active at a time
    expect((instance.work_active as () => number)()).toBe(1);
    expect((instance.work_pending as () => number)()).toBe(1);

    resolvers[0]();
    await t1;
    resolvers[1]();
    await t2;
  });

  it("decorated method called concurrently up to pool limit — active() signal is accurate", async () => {
    const { ctx, run } = methodCtx("process");
    const resolvers: Array<() => void> = [];
    const original = async () => new Promise<void>((r) => resolvers.push(r));
    Pool(3)(original, ctx);

    const instance: Record<string, unknown> = {};
    run(instance);

    const process = instance.process as () => Promise<void>;
    const active = instance.process_active as () => number;

    const t1 = process();
    expect(active()).toBe(1);

    const t2 = process();
    expect(active()).toBe(2);

    const t3 = process();
    expect(active()).toBe(3);

    // 4th task exceeds limit, goes to pending
    const t4 = process();
    expect(active()).toBe(3);
    expect((instance.process_pending as () => number)()).toBe(1);

    // Resolve t1 first — this will allow t4 to start and push its resolver
    resolvers[0]();
    await t1;

    // Now t4 has started and pushed a resolver
    resolvers[1]();
    resolvers[2]();
    resolvers[3]();
    await Promise.all([t2, t3, t4]);

    expect(active()).toBe(0);
  });
});
