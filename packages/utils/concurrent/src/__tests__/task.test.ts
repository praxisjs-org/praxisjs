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
});
