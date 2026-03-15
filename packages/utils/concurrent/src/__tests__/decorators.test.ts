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
});
