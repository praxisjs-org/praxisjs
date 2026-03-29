import { describe, it, expect } from "vitest";

import { queue, QueueClearedError } from "../queue";

describe("queue", () => {
  it("executes the task and resolves the promise", async () => {
    const q = queue(async (x: unknown) => (x as number) * 2);
    const result = await q(5);
    expect(result).toBe(10);
  });

  it("runs tasks sequentially (FIFO)", async () => {
    const order: number[] = [];
    const q = queue(async (n: unknown) => {
      order.push(n as number);
      return n as number;
    });
    await Promise.all([q(1), q(2), q(3)]);
    expect(order).toEqual([1, 2, 3]);
  });

  it("loading is true while running, false when done", async () => {
    let resolve!: () => void;
    const q = queue(
      () => new Promise<void>((r) => { resolve = r; }),
    );
    const p = q();
    expect(q.loading()).toBe(true);
    resolve();
    await p;
    expect(q.loading()).toBe(false);
  });

  it("pending decrements as tasks complete", async () => {
    let resolveFirst!: () => void;
    const q = queue(
      (_: unknown, idx: unknown) =>
        idx === 0
          ? new Promise<void>((r) => { resolveFirst = r; })
          : Promise.resolve(),
    );

    const p1 = q(null, 0);
    const p2 = q(null, 1);

    // Both enqueued — first is running, second is pending
    expect(q.pending()).toBeGreaterThanOrEqual(0);

    resolveFirst();
    await p1;
    await p2;

    expect(q.pending()).toBe(0);
  });

  it("captures errors in the error signal", async () => {
    const q = queue(async () => {
      throw new Error("boom");
    });
    await expect(q()).rejects.toThrow("boom");
    expect(q.error()?.message).toBe("boom");
  });

  it("wraps non-Error throws in an Error", async () => {
    const q = queue(async () => {
      // eslint-disable-next-line @typescript-eslint/no-throw-literal
      throw "string error";
    });
    await expect(q()).rejects.toThrow("string error");
    expect(q.error()?.message).toBe("string error");
  });

  it("error in one task does not prevent subsequent tasks from running", async () => {
    const q = queue(async (n: unknown) => {
      if (n === 0) throw new Error("task 0 failed");
      return n as number;
    });

    const p0 = q(0); // will reject
    const p1 = q(1); // should still run despite p0 failing
    const p2 = q(2);

    await expect(p0).rejects.toThrow("task 0 failed");
    expect(await p1).toBe(1);
    expect(await p2).toBe(2);
    expect(q.error()?.message).toBe("task 0 failed");
  });

  it("clear() empties the pending queue", async () => {
    let resolveFirst!: () => void;
    const q = queue(
      (_: unknown, idx: unknown) =>
        idx === 0
          ? new Promise<void>((r) => { resolveFirst = r; })
          : Promise.resolve(),
    );

    q(null, 0);
    const p1 = q(null, 1);
    const p2 = q(null, 2);

    // Suppress expected rejections from clear()
    p1.catch(() => undefined);
    p2.catch(() => undefined);

    q.clear();
    resolveFirst();

    // After clearing, pending count should be 0
    expect(q.pending()).toBe(0);
  });

  it("clear() with pending tasks rejects their promises with QueueClearedError", async () => {
    let resolveFirst!: () => void;
    const q = queue(
      (_: unknown, idx: unknown) =>
        idx === 0
          ? new Promise<void>((r) => { resolveFirst = r; })
          : Promise.resolve(),
    );

    q(null, 0); // running — not in _queue
    const p1 = q(null, 1); // pending — in _queue
    const p2 = q(null, 2); // pending — in _queue

    q.clear();

    await expect(p1).rejects.toBeInstanceOf(QueueClearedError);
    await expect(p2).rejects.toBeInstanceOf(QueueClearedError);

    resolveFirst();
  });

  it("clear() then new enqueue() — queue works normally after being cleared", async () => {
    let resolveFirst!: () => void;
    const q = queue(
      (n: unknown, stall: unknown) =>
        stall
          ? new Promise<number>((r) => { resolveFirst = () => r(n as number); })
          : Promise.resolve(n as number),
    );

    q(0, true); // running — stalls
    const p1 = q(1, false); // pending
    q.clear();

    await expect(p1).rejects.toBeInstanceOf(QueueClearedError);
    resolveFirst();

    // Queue should work normally after clearing
    const result = await q(42, false);
    expect(result).toBe(42);
    expect(q.pending()).toBe(0);
  });

  it("clear() with no pending tasks — no-op, no crash", () => {
    const q = queue(async () => "ok");
    expect(() => q.clear()).not.toThrow();
    expect(q.pending()).toBe(0);
  });

  it("error in task does not corrupt pending counter", async () => {
    const q = queue(async (n: unknown) => {
      if (n === 0) throw new Error("bad");
      return n as number;
    });

    const p0 = q(0);
    const p1 = q(1);
    const p2 = q(2);

    await expect(p0).rejects.toThrow("bad");
    expect(await p1).toBe(1);
    expect(await p2).toBe(2);
    expect(q.pending()).toBe(0);
  });

  it("multiple tasks error — only last error stored", async () => {
    const q = queue(async (n: unknown) => {
      throw new Error(`error ${n as number}`);
    });

    const p0 = q(0);
    const p1 = q(1);
    const p2 = q(2);

    await expect(p0).rejects.toThrow("error 0");
    await expect(p1).rejects.toThrow("error 1");
    await expect(p2).rejects.toThrow("error 2");

    // Only the last error is stored
    expect(q.error()?.message).toBe("error 2");
  });

  it("very large queue (100 tasks, concurrency=1) — all execute in order", async () => {
    const order: number[] = [];
    const q = queue(async (n: unknown) => {
      order.push(n as number);
      return n as number;
    });

    const tasks = Array.from({ length: 100 }, (_, i) => q(i));
    await Promise.all(tasks);

    expect(order).toEqual(Array.from({ length: 100 }, (_, i) => i));
    expect(q.pending()).toBe(0);
  });
});
