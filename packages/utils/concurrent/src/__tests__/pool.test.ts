import { describe, it, expect } from "vitest";

import { pool } from "../pool";

describe("pool", () => {
  it("executes a task and resolves with its result", async () => {
    const p = pool(2, async (x: unknown) => (x as number) * 3);
    expect(await p(4)).toBe(12);
  });

  it("respects concurrency limit", async () => {
    let active = 0;
    let maxActive = 0;

    const p = pool(2, async () => {
      active++;
      maxActive = Math.max(maxActive, active);
      await new Promise((r) => setTimeout(r, 10));
      active--;
    });

    await Promise.all([p(), p(), p(), p()]);
    expect(maxActive).toBeLessThanOrEqual(2);
  });

  it("active() reflects currently running tasks", async () => {
    const resolvers: Array<() => void> = [];
    const p = pool(
      3,
      () => new Promise<void>((r) => resolvers.push(r)),
    );

    const tasks = [p(), p()];
    expect(p.active()).toBe(2);
    resolvers.forEach((r) => { r(); });
    await Promise.all(tasks);
    expect(p.active()).toBe(0);
  });

  it("loading is true when active > 0", async () => {
    let resolve!: () => void;
    const p = pool(
      1,
      () => new Promise<void>((r) => { resolve = r; }),
    );
    const task = p();
    expect(p.loading()).toBe(true);
    resolve();
    await task;
    expect(p.loading()).toBe(false);
  });

  it("captures errors in the error signal and resolves undefined", async () => {
    const p = pool(1, async () => {
      throw new Error("pool error");
    });
    const result = await p();
    expect(result).toBeUndefined();
    expect(p.error()?.message).toBe("pool error");
  });

  it("pending count decrements as tasks start", async () => {
    let resolveFirst!: () => void;
    const started: number[] = [];
    const p = pool(1, async (idx: unknown) => {
      started.push(idx as number);
      if (idx === 0) await new Promise<void>((r) => { resolveFirst = r; });
    });

    const t1 = p(0);
    const t2 = p(1);

    // second task is pending while first runs
    expect(p.pending()).toBe(1);
    resolveFirst();
    await t1;
    await t2;
    expect(p.pending()).toBe(0);
  });

  it("wraps non-Error throws in an Error object", async () => {
    const p = pool(1, async () => {
      // eslint-disable-next-line @typescript-eslint/only-throw-error
      throw "plain string error";
    });
    const result = await p();
    expect(result).toBeUndefined();
    expect(p.error()).toBeInstanceOf(Error);
    expect(p.error()?.message).toBe("plain string error");
  });

  it("concurrency=1 guarantees serial execution", async () => {
    const order: number[] = [];
    let resolveFirst!: () => void;

    const p = pool(1, async (n: unknown) => {
      if (n === 0) await new Promise<void>((r) => { resolveFirst = r; });
      order.push(n as number);
    });

    const t1 = p(0);
    const t2 = p(1);

    // t2 cannot start until t1 finishes
    expect(p.active()).toBe(1);
    expect(p.pending()).toBe(1);

    resolveFirst();
    await t1;
    await t2;

    expect(order).toEqual([0, 1]); // serial order preserved
  });

  it("error in one task does not block subsequent tasks", async () => {
    const results: Array<number | undefined> = [];
    const p = pool(1, async (n: unknown) => {
      if (n === 0) throw new Error("task 0 failed");
      return n as number;
    });

    const r0 = p(0);
    const r1 = p(1);

    results.push(await r0);
    results.push(await r1);

    expect(results[0]).toBeUndefined(); // error → undefined
    expect(results[1]).toBe(1);         // subsequent task ran
  });

  it("active() never exceeds concurrency", async () => {
    const concurrency = 2;
    let maxObservedActive = 0;

    const p = pool(concurrency, async () => {
      maxObservedActive = Math.max(maxObservedActive, p.active());
      await new Promise((r) => setTimeout(r, 5));
    });

    await Promise.all([p(), p(), p(), p()]);
    expect(maxObservedActive).toBeLessThanOrEqual(concurrency);
  });
});
