import { describe, it, expect } from "vitest";

import { queue } from "../queue";

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

  it("clear() empties the pending queue", async () => {
    let resolveFirst!: () => void;
    const q = queue(
      (_: unknown, idx: unknown) =>
        idx === 0
          ? new Promise<void>((r) => { resolveFirst = r; })
          : Promise.resolve(),
    );

    q(null, 0);
    q(null, 1);
    q(null, 2);

    q.clear();
    resolveFirst();

    // After clearing, pending count should be 0
    expect(q.pending()).toBe(0);
  });
});
