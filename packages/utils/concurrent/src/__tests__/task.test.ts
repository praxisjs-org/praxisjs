import { describe, it, expect } from "vitest";

import { task } from "../task";

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

describe("task — without signal", () => {
  it("resolves with the function result", async () => {
    const t = task(async (x: unknown) => (x as number) + 1);
    expect(await t(9)).toBe(10);
  });

  it("sets loading to true while running", async () => {
    let resolve!: (v: number) => void;
    const t = task(() => new Promise<number>((r) => { resolve = r; }));

    const p = t();
    expect(t.loading()).toBe(true);
    resolve(42);
    await p;
    expect(t.loading()).toBe(false);
  });

  it("stores last result", async () => {
    const t = task(async () => "hello");
    await t();
    expect(t.lastResult()).toBe("hello");
  });

  it("captures errors in the error signal", async () => {
    const t = task(async () => { throw new Error("task failed"); });
    const result = await t();
    expect(result).toBeUndefined();
    expect(t.error()?.message).toBe("task failed");
  });

  it("clears error on a new run", async () => {
    let shouldFail = true;
    const t = task(async () => {
      if (shouldFail) throw new Error("oops");
      return "ok";
    });
    await t();
    shouldFail = false;
    await t();
    expect(t.error()).toBeNull();
    expect(t.lastResult()).toBe("ok");
  });

  it("cancelAll() discards in-flight results", async () => {
    let resolve!: (v: string) => void;
    const t = task(() => new Promise<string>((r) => { resolve = r; }));
    const p = t();
    t.cancelAll();
    resolve("stale");
    expect(await p).toBeUndefined();
    expect(t.loading()).toBe(false);
  });

  it("cancelAll() during a failing task discards the error", async () => {
    let reject!: (err: unknown) => void;
    const t = task(() => new Promise<string>((_res, rej) => { reject = rej; }));
    const p = t();
    t.cancelAll();
    reject(new Error("cancelled"));
    expect(await p).toBeUndefined();
    expect(t.error()).toBeNull();
  });

  it("wraps non-Error throws in an Error object", async () => {
    // eslint-disable-next-line @typescript-eslint/only-throw-error
    const t = task(async () => { throw "string-error"; });
    await t();
    expect(t.error()).toBeInstanceOf(Error);
    expect(t.error()?.message).toBe("string-error");
  });

  it("AbortError thrown by fn itself (no cancelAll) is not stored in error()", async () => {
    const t = task(async () => { throw new DOMException("Aborted", "AbortError"); });
    const result = await t();
    expect(result).toBeUndefined();
    expect(t.error()).toBeNull();
    expect(t.loading()).toBe(false);
  });

  it("second run while first is pending discards the first result", async () => {
    let resolveFirst!: (v: string) => void;
    let resolveSecond!: (v: string) => void;
    const t = task((run: unknown) =>
      run === 1
        ? new Promise<string>((r) => { resolveFirst = r; })
        : new Promise<string>((r) => { resolveSecond = r; }),
    );
    let run = 1;
    const p1 = t(run++);
    const p2 = t(run++);
    resolveSecond("result-2");
    resolveFirst("result-1");
    const [r1, r2] = await Promise.all([p1, p2]);
    expect(r2).toBe("result-2");
    expect(r1).toBeUndefined();
    expect(t.lastResult()).toBe("result-2");
  });

  it("synchronous function (non-async) resolves correctly via await", async () => {
    const t = task((() => 42) as unknown as () => Promise<number>);
    expect(await t()).toBe(42);
    expect(t.lastResult()).toBe(42);
  });
});

// ── With AbortSignal (opt-in via first param named "signal") ──────────────────

describe("task — with signal", () => {
  it("resolves with the function result", async () => {
    const t = task(async (signal, x: unknown) => { void (signal as AbortSignal); return (x as number) + 1; });
    expect(await t(9)).toBe(10);
  });

  it("passes a live AbortSignal to fn", async () => {
    let capturedSignal!: AbortSignal;
    const t = task(async (signal) => { capturedSignal = signal as AbortSignal; return "done"; });
    await t();
    expect(capturedSignal).toBeInstanceOf(AbortSignal);
    expect(capturedSignal.aborted).toBe(false);
  });

  it("new run aborts the previous signal", async () => {
    const signals: AbortSignal[] = [];
    let resolveFirst!: () => void;
    const t = task(async (signal) => {
      signals.push(signal as AbortSignal);
      if (signals.length === 1) await new Promise<void>((r) => { resolveFirst = r; });
      return signals.length;
    });
    const p1 = t();
    const p2 = t();
    resolveFirst();
    await Promise.all([p1, p2]);
    expect(signals[0].aborted).toBe(true);
    expect(signals[1].aborted).toBe(false);
  });

  it("cancelAll() aborts the current signal", async () => {
    let capturedSignal!: AbortSignal;
    let resolve!: () => void;
    const t = task(async (signal) => {
      capturedSignal = signal as AbortSignal;
      await new Promise<void>((r) => { resolve = r; });
    });
    const p = t();
    t.cancelAll();
    resolve();
    await p;
    expect(capturedSignal.aborted).toBe(true);
  });

  it("AbortError from cancelAll() is not stored in error()", async () => {
    const t = task(async (signal) => { await delay(10000, signal as AbortSignal); });
    const p = t();
    t.cancelAll();
    await p;
    expect(t.error()).toBeNull();
    expect(t.loading()).toBe(false);
  });

  it("AbortError from a superseded run is not stored in error()", async () => {
    const t = task(async (signal, which: unknown) => {
      if (which === "first") await delay(10000, signal as AbortSignal);
      return which as string;
    });
    const p1 = t("first");
    const p2 = t("second");
    const [r1, r2] = await Promise.all([p1, p2]);
    expect(r1).toBeUndefined();
    expect(r2).toBe("second");
    expect(t.error()).toBeNull();
  });

  it("cancelAll() called, then new call — new call works normally", async () => {
    let resolveStale!: (v: string) => void;
    const t = task((signal, which: unknown) =>
      which === "stale"
        ? new Promise<string>((r) => { resolveStale = r; })
        : Promise.resolve("fresh"),
    );
    const staleP = t("stale");
    t.cancelAll();
    resolveStale("stale-value");
    await staleP;
    expect(await t("fresh")).toBe("fresh");
    expect(t.lastResult()).toBe("fresh");
  });
});
