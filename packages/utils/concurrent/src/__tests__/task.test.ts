import { describe, it, expect } from "vitest";

import { task } from "../task";

describe("task", () => {
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
    const t = task(async () => {
      throw new Error("task failed");
    });
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
    expect(t.error()).not.toBeNull();

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
    const result = await p;

    expect(result).toBeUndefined();
    expect(t.loading()).toBe(false);
  });

  it("cancelAll() during a failing task discards the error", async () => {
    let reject!: (err: unknown) => void;
    const t = task(() => new Promise<string>((_res, rej) => { reject = rej; }));

    const p = t();
    t.cancelAll();
    reject(new Error("cancelled"));
    const result = await p;

    // The error was from a stale run — result is undefined, no error stored
    expect(result).toBeUndefined();
    expect(t.error()).toBeNull();
  });

  it("wraps non-Error throws in an Error object", async () => {
    const t = task(async () => {
      // eslint-disable-next-line @typescript-eslint/only-throw-error
      throw "string-error";
    });
    const result = await t();
    expect(result).toBeUndefined();
    expect(t.error()).toBeInstanceOf(Error);
    expect(t.error()?.message).toBe("string-error");
  });

  it("second run while first is pending discards the first result", async () => {
    let resolveFirst!: (v: string) => void;
    let resolveSecond!: (v: string) => void;

    const t = task((_run: unknown) =>
      (_run === 1
        ? new Promise<string>((r) => { resolveFirst = r; })
        : new Promise<string>((r) => { resolveSecond = r; })),
    );

    let run = 1;
    const p1 = t(run++);  // run 1
    const p2 = t(run++);  // run 2 — increments _runId, making run 1 stale

    resolveSecond("result-2");
    resolveFirst("result-1"); // stale

    const [r1, r2] = await Promise.all([p1, p2]);
    expect(r2).toBe("result-2");
    expect(r1).toBeUndefined(); // stale run discarded
    expect(t.lastResult()).toBe("result-2");
  });

  it("synchronous function (non-async) resolves correctly via await", async () => {
    // await on a non-Promise simply resolves the value
    const t = task((() => 42) as unknown as () => Promise<number>);
    const result = await t();
    expect(result).toBe(42);
    expect(t.lastResult()).toBe(42);
    expect(t.loading()).toBe(false);
  });

  it("cancelAll() followed by a new run works correctly", async () => {
    const t = task(async () => "fresh");
    let resolve!: (v: string) => void;
    const staleTask = task(() => new Promise<string>((r) => { resolve = r; }));

    const p = staleTask();
    staleTask.cancelAll();
    resolve("stale");
    await p;

    // Now run a fresh task after cancelAll
    const result = await t();
    expect(result).toBe("fresh");
    expect(t.loading()).toBe(false);
  });
});
