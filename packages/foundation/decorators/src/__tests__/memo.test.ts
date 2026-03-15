import { describe, it, expect, vi } from "vitest";

import { Memo } from "../functions/memo";

function mockCtx(name: string) {
  return { name, kind: "method" as const } as ClassMethodDecoratorContext;
}

describe("Memo", () => {
  it("returns the computed value", () => {
    const fn = vi.fn((x: unknown) => (x as number) * 2);
    const wrapped = Memo()(fn, mockCtx("double"));
    const obj = {};
    expect(wrapped.call(obj, 5)).toBe(10);
  });

  it("caches result for same args — calls original only once", () => {
    const fn = vi.fn((x: unknown) => (x as number) + 1);
    const wrapped = Memo()(fn, mockCtx("inc"));
    const obj = {};
    wrapped.call(obj, 3);
    wrapped.call(obj, 3);
    wrapped.call(obj, 3);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("computes separately for different args", () => {
    const fn = vi.fn((x: unknown) => (x as number) * 10);
    const wrapped = Memo()(fn, mockCtx("mul"));
    const obj = {};
    expect(wrapped.call(obj, 2)).toBe(20);
    expect(wrapped.call(obj, 3)).toBe(30);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("is per-instance — different instances have separate caches", () => {
    const fn = vi.fn(() => Math.random());
    const wrapped = Memo()(fn, mockCtx("rand"));
    const a = {};
    const b = {};
    const v1 = wrapped.call(a);
    const v2 = wrapped.call(b);
    expect(fn).toHaveBeenCalledTimes(2);
    expect(v1).not.toBe(v2); // different random values per instance
  });

  it("serializes no-args calls with __no_args__ key", () => {
    const fn = vi.fn(() => 42);
    const wrapped = Memo()(fn, mockCtx("noop"));
    const obj = {};
    wrapped.call(obj);
    wrapped.call(obj);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("serializes object args via JSON.stringify", () => {
    const fn = vi.fn((o: unknown) => JSON.stringify(o));
    const wrapped = Memo()(fn, mockCtx("obj"));
    const obj = {};
    wrapped.call(obj, { a: 1 });
    wrapped.call(obj, { a: 1 }); // same key
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("serializes symbol args via toString()", () => {
    const fn = vi.fn((s: unknown) => String(s));
    const wrapped = Memo()(fn, mockCtx("sym"));
    const obj = {};
    const sym = Symbol("test");
    wrapped.call(obj, sym);
    wrapped.call(obj, sym);
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
