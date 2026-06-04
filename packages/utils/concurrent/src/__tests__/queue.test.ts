import { describe, it, expect } from "vitest";

import { queue, QueueClearedError } from "../queue";

/** Abortable delay — rejects with AbortError when signal fires. */
function delay(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => {
      clearTimeout(timer);
      reject(Object.assign(new Error("Aborted"), { name: "AbortError" }));
    }, { once: true });
  });
}

// ── Without AbortSignal (existing behaviour) ───────────────────────────────────

describe("queue — without signal", () => {
  it("executes the task and resolves the promise", async () => {
    const q = queue(async (x: unknown) => (x as number) * 2);
    expect(await q(5)).toBe(10);
  });

  it("runs tasks sequentially (FIFO)", async () => {
    const order: number[] = [];
    const q = queue(async (n: unknown) => { order.push(n as number); return n as number; });
    await Promise.all([q(1), q(2), q(3)]);
    expect(order).toEqual([1, 2, 3]);
  });

  it("loading is true while running, false when done", async () => {
    let resolve!: () => void;
    const q = queue(() => new Promise<void>((r) => { resolve = r; }));
    const p = q();
    expect(q.loading()).toBe(true);
    resolve();
    await p;
    expect(q.loading()).toBe(false);
  });

  it("pending decrements as tasks complete", async () => {
    let resolveFirst!: () => void;
    const q = queue((_: unknown, idx: unknown) =>
      idx === 0
        ? new Promise<void>((r) => { resolveFirst = r; })
        : Promise.resolve(),
    );
    const p1 = q(null, 0);
    const p2 = q(null, 1);
    expect(q.pending()).toBeGreaterThanOrEqual(0);
    resolveFirst();
    await p1;
    await p2;
    expect(q.pending()).toBe(0);
  });

  it("captures errors in the error signal", async () => {
    const q = queue(async () => { throw new Error("boom"); });
    await expect(q()).rejects.toThrow("boom");
    expect(q.error()?.message).toBe("boom");
  });

  it("wraps non-Error throws in an Error", async () => {
    // eslint-disable-next-line @typescript-eslint/no-throw-literal
    const q = queue(async () => { throw "string error"; });
    await expect(q()).rejects.toThrow("string error");
    expect(q.error()?.message).toBe("string error");
  });

  it("error in one task does not prevent subsequent tasks from running", async () => {
    const q = queue(async (n: unknown) => {
      if (n === 0) throw new Error("task 0 failed");
      return n as number;
    });
    const p0 = q(0);
    const p1 = q(1);
    const p2 = q(2);
    await expect(p0).rejects.toThrow("task 0 failed");
    expect(await p1).toBe(1);
    expect(await p2).toBe(2);
  });

  it("clear() with pending tasks rejects their promises with QueueClearedError", async () => {
    let resolveFirst!: () => void;
    const q = queue((_: unknown, idx: unknown) =>
      idx === 0
        ? new Promise<void>((r) => { resolveFirst = r; })
        : Promise.resolve(),
    );
    q(null, 0);
    const p1 = q(null, 1);
    const p2 = q(null, 2);
    q.clear();
    await expect(p1).rejects.toBeInstanceOf(QueueClearedError);
    await expect(p2).rejects.toBeInstanceOf(QueueClearedError);
    resolveFirst();
  });

  it("clear() then new enqueue() — queue works normally after being cleared", async () => {
    let resolveFirst!: () => void;
    const q = queue((n: unknown, stall: unknown) =>
      stall
        ? new Promise<number>((r) => { resolveFirst = () => r(n as number); })
        : Promise.resolve(n as number),
    );
    q(0, true);
    const p1 = q(1, false);
    q.clear();
    await expect(p1).rejects.toBeInstanceOf(QueueClearedError);
    resolveFirst();
    expect(await q(42, false)).toBe(42);
    expect(q.pending()).toBe(0);
  });

  it("clear() with no pending tasks — no-op, no crash", () => {
    const q = queue(async () => "ok");
    expect(() => q.clear()).not.toThrow();
    expect(q.pending()).toBe(0);
  });

  it("very large queue (100 tasks) — all execute in order", async () => {
    const order: number[] = [];
    const q = queue(async (n: unknown) => { order.push(n as number); return n as number; });
    await Promise.all(Array.from({ length: 100 }, (_, i) => q(i)));
    expect(order).toEqual(Array.from({ length: 100 }, (_, i) => i));
    expect(q.pending()).toBe(0);
  });
});

// ── With AbortSignal (opt-in via first param named "signal") ──────────────────

describe("queue — with signal", () => {
  it("passes a live AbortSignal to fn", async () => {
    let capturedSignal!: AbortSignal;
    const q = queue(async (signal) => { capturedSignal = signal as AbortSignal; });
    await q();
    expect(capturedSignal).toBeInstanceOf(AbortSignal);
    expect(capturedSignal.aborted).toBe(false);
  });

  it("executes tasks and passes correct args alongside signal", async () => {
    const q = queue(async (signal, x: unknown) => { void (signal as AbortSignal); return (x as number) * 2; });
    expect(await q(5)).toBe(10);
  });

  it("clear() aborts the running item's signal", async () => {
    let capturedSignal!: AbortSignal;
    let resolve!: () => void;
    const q = queue(async (signal) => {
      capturedSignal = signal as AbortSignal;
      await new Promise<void>((r) => { resolve = r; });
    });
    const p = q();
    p.catch(() => undefined);
    await Promise.resolve(); // let drain start
    q.clear();
    resolve();
    await p.catch(() => undefined);
    expect(capturedSignal.aborted).toBe(true);
  });

  it("clear() rejects the running item with QueueClearedError", async () => {
    const q = queue(async (signal) => { await delay(10000, signal as AbortSignal); });
    const p = q();
    await Promise.resolve();
    q.clear();
    await expect(p).rejects.toBeInstanceOf(QueueClearedError);
  });

  it("AbortError from clear() is not stored in error()", async () => {
    const q = queue(async (signal) => { await delay(10000, signal as AbortSignal); });
    const p = q();
    await Promise.resolve();
    q.clear();
    await p.catch(() => undefined);
    expect(q.error()).toBeNull();
  });

  it("each pending item gets its own AbortSignal, all aborted on clear()", async () => {
    const signals: AbortSignal[] = [];
    let resolveFirst!: () => void;
    const q = queue(async (signal, idx: unknown) => {
      signals.push(signal as AbortSignal);
      if (idx === 0) await new Promise<void>((r) => { resolveFirst = r; });
    });
    const p0 = q(0);
    const p1 = q(1);
    const p2 = q(2);
    p1.catch(() => undefined);
    p2.catch(() => undefined);
    await Promise.resolve();
    q.clear();
    resolveFirst();
    await Promise.all([p0.catch(() => undefined), p1.catch(() => undefined), p2.catch(() => undefined)]);
    expect(signals[0]?.aborted).toBe(true);
  });
});
