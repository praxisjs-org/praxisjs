import { describe, it, expect, vi } from "vitest";

import { pool } from "../pool";

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

describe("pool — without signal", () => {
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
    const p = pool(3, () => new Promise<void>((r) => resolvers.push(r)));
    const tasks = [p(), p()];
    expect(p.active()).toBe(2);
    resolvers.forEach((r) => { r(); });
    await Promise.all(tasks);
    expect(p.active()).toBe(0);
  });

  it("loading is true when active > 0", async () => {
    let resolve!: () => void;
    const p = pool(1, () => new Promise<void>((r) => { resolve = r; }));
    const t = p();
    expect(p.loading()).toBe(true);
    resolve();
    await t;
    expect(p.loading()).toBe(false);
  });

  it("captures errors in the error signal and resolves undefined", async () => {
    const p = pool(1, async () => { throw new Error("pool error"); });
    expect(await p()).toBeUndefined();
    expect(p.error()?.message).toBe("pool error");
  });

  it("wraps non-Error throws in an Error object", async () => {
    // eslint-disable-next-line @typescript-eslint/only-throw-error
    const p = pool(1, async () => { throw "plain string error"; });
    expect(await p()).toBeUndefined();
    expect(p.error()).toBeInstanceOf(Error);
    expect(p.error()?.message).toBe("plain string error");
  });

  it("AbortError thrown by fn itself (no cancelAll) is not stored in error()", async () => {
    const p = pool(1, async () => { throw new DOMException("Aborted", "AbortError"); });
    const result = await p();
    expect(result).toBeUndefined();
    expect(p.error()).toBeNull();
  });

  it("pending count decrements as tasks start", async () => {
    let resolveFirst!: () => void;
    const p = pool(1, async (idx: unknown) => {
      if (idx === 0) await new Promise<void>((r) => { resolveFirst = r; });
    });
    const t1 = p(0);
    const t2 = p(1);
    expect(p.pending()).toBe(1);
    resolveFirst();
    await t1;
    await t2;
    expect(p.pending()).toBe(0);
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
    expect(p.active()).toBe(1);
    expect(p.pending()).toBe(1);
    resolveFirst();
    await t1;
    await t2;
    expect(order).toEqual([0, 1]);
  });

  it("error in one task does not block subsequent tasks", async () => {
    const p = pool(1, async (n: unknown) => {
      if (n === 0) throw new Error("task 0 failed");
      return n as number;
    });
    expect(await p(0)).toBeUndefined();
    expect(await p(1)).toBe(1);
  });

  it("concurrency=0 — clamps to 1", async () => {
    const fn = vi.fn(async () => "result");
    const p = pool(0, fn);
    expect(await p()).toBe("result");
    expect(fn).toHaveBeenCalledOnce();
  });

  it("cancelAll() when idle — no-op, no crash", () => {
    const p = pool(2, async () => "ok");
    expect(() => p.cancelAll()).not.toThrow();
    expect(p.pending()).toBe(0);
    expect(p.active()).toBe(0);
  });
});

// ── With AbortSignal (opt-in via first param named "signal") ──────────────────

describe("pool — with signal", () => {
  it("passes a live AbortSignal to fn", async () => {
    let capturedSignal!: AbortSignal;
    const p = pool(1, async (signal) => { capturedSignal = signal as AbortSignal; });
    await p();
    expect(capturedSignal).toBeInstanceOf(AbortSignal);
    expect(capturedSignal.aborted).toBe(false);
  });

  it("executes tasks and passes correct args alongside signal", async () => {
    const p = pool(2, async (signal, x: unknown) => { void (signal as AbortSignal); return (x as number) * 3; });
    expect(await p(4)).toBe(12);
  });

  it("cancelAll() aborts all active signals", async () => {
    const signals: AbortSignal[] = [];
    const resolvers: Array<() => void> = [];
    const p = pool(3, async (signal) => {
      signals.push(signal as AbortSignal);
      await new Promise<void>((r) => resolvers.push(r));
    });
    const t1 = p();
    const t2 = p();
    const t3 = p();
    await Promise.resolve();
    p.cancelAll();
    resolvers.forEach((r) => r());
    await Promise.all([t1, t2, t3]);
    expect(signals.every((s) => s.aborted)).toBe(true);
  });

  it("cancelAll() resolves active tasks as undefined without setting error()", async () => {
    const p = pool(1, async (signal) => { await delay(10000, signal as AbortSignal); });
    const t = p();
    await Promise.resolve();
    p.cancelAll();
    expect(await t).toBeUndefined();
    expect(p.error()).toBeNull();
    expect(p.active()).toBe(0);
  });

  it("cancelAll() resolves pending tasks as undefined", async () => {
    let resolveFirst!: () => void;
    const p = pool(1, async (signal, idx: unknown) => {
      void (signal as AbortSignal);
      if (idx === 0) await new Promise<void>((r) => { resolveFirst = r; });
    });
    const t1 = p(0);
    const t2 = p(1);
    const t3 = p(2);
    await Promise.resolve();
    p.cancelAll();
    resolveFirst();
    const [r1, r2, r3] = await Promise.all([t1, t2, t3]);
    expect(r1).toBeUndefined();
    expect(r2).toBeUndefined();
    expect(r3).toBeUndefined();
    expect(p.pending()).toBe(0);
    expect(p.error()).toBeNull();
  });

  it("cancelAll() then new runs work normally", async () => {
    let resolve!: () => void;
    const p = pool(1, async (signal, which: unknown) => {
      void (signal as AbortSignal);
      if (which === "stale") await new Promise<void>((r) => { resolve = r; });
      return which as string;
    });
    const stale = p("stale");
    await Promise.resolve();
    p.cancelAll();
    resolve();
    await stale;
    expect(await p("fresh")).toBe("fresh");
    expect(p.active()).toBe(0);
    expect(p.error()).toBeNull();
  });
});
