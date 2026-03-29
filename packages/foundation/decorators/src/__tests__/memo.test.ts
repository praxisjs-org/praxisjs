import { describe, it, expect, vi } from "vitest";

import { signal } from "@praxisjs/core/internal";
import { Memo } from "../functions/memo";

function mockCtx(name: string) {
  const initializers: Array<(this: object) => void> = [];
  return {
    name,
    kind: "method" as const,
    addInitializer(fn: (this: object) => void) {
      initializers.push(fn);
    },
    runInitializers(instance: object) {
      initializers.forEach((fn) => { fn.call(instance); });
    },
  } as unknown as ClassMethodDecoratorContext & { runInitializers(instance: object): void };
}

describe("Memo", () => {
  it("returns the computed value", () => {
    const fn = vi.fn((x: unknown) => (x as number) * 2);
    const ctx = mockCtx("double");
    Memo()(fn, ctx);

    const obj = {};
    ctx.runInitializers(obj);
    const method = (obj as Record<string, (...a: unknown[]) => unknown>).double;

    expect(method(5)).toBe(10);
  });

  it("caches result for same args — calls original only once", () => {
    const fn = vi.fn((x: unknown) => (x as number) + 1);
    const ctx = mockCtx("inc");
    Memo()(fn, ctx);

    const obj = {};
    ctx.runInitializers(obj);
    const method = (obj as Record<string, (...a: unknown[]) => unknown>).inc;

    method(3);
    method(3);
    method(3);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("computes separately for different args", () => {
    const fn = vi.fn((x: unknown) => (x as number) * 10);
    const ctx = mockCtx("mul");
    Memo()(fn, ctx);

    const obj = {};
    ctx.runInitializers(obj);
    const method = (obj as Record<string, (...a: unknown[]) => unknown>).mul;

    expect(method(2)).toBe(20);
    expect(method(3)).toBe(30);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("is per-instance — different instances have separate caches", () => {
    const fn = vi.fn(() => Math.random());
    const ctx = mockCtx("rand");
    Memo()(fn, ctx);

    const a = {};
    const b = {};
    ctx.runInitializers(a);
    ctx.runInitializers(b);

    const methodA = (a as Record<string, () => unknown>).rand;
    const methodB = (b as Record<string, () => unknown>).rand;
    const v1 = methodA();
    const v2 = methodB();
    expect(fn).toHaveBeenCalledTimes(2);
    expect(v1).not.toBe(v2); // different random values per instance
  });

  it("serializes no-args calls with __no_args__ key", () => {
    const fn = vi.fn(() => 42);
    const ctx = mockCtx("noop");
    Memo()(fn, ctx);

    const obj = {};
    ctx.runInitializers(obj);
    const method = (obj as Record<string, () => unknown>).noop;

    method();
    method();
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("serializes object args via JSON.stringify", () => {
    const fn = vi.fn((o: unknown) => JSON.stringify(o));
    const ctx = mockCtx("obj");
    Memo()(fn, ctx);

    const obj = {};
    ctx.runInitializers(obj);
    const method = (obj as Record<string, (...a: unknown[]) => unknown>).obj;

    method({ a: 1 });
    method({ a: 1 }); // same key
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("re-evaluates when a reactive signal read inside the method changes", () => {
    const s = signal(1);
    const fn = vi.fn(() => s() * 10);
    const ctx = mockCtx("reactive");
    Memo()(fn, ctx);

    const obj = {};
    ctx.runInitializers(obj);
    const method = (obj as Record<string, () => unknown>).reactive;

    expect(method()).toBe(10);
    expect(fn).toHaveBeenCalledTimes(1);

    s.set(5);
    // The computed tracks s() — next read triggers recomputation
    expect(method()).toBe(50);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("serializes symbol args via toString()", () => {
    const fn = vi.fn((s: unknown) => String(s));
    const ctx = mockCtx("sym");
    Memo()(fn, ctx);

    const obj = {};
    ctx.runInitializers(obj);
    const method = (obj as Record<string, (...a: unknown[]) => unknown>).sym;

    const sym = Symbol("test");
    method(sym);
    method(sym);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("circular object argument does not crash — falls back to stable identity key", () => {
    const fn = vi.fn((o: unknown) => o);
    const ctx = mockCtx("circular");
    Memo()(fn, ctx);

    const obj = {};
    ctx.runInitializers(obj);
    const method = (obj as Record<string, (...a: unknown[]) => unknown>).circular;

    // Create a circular reference
    const circ: Record<string, unknown> = {};
    circ.self = circ;

    expect(() => method(circ)).not.toThrow();
    // Calling again with the same object should hit cache (not call fn again)
    method(circ);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("two circular objects produce different cache keys", () => {
    const fn = vi.fn((o: unknown) => o);
    const ctx = mockCtx("circular2");
    Memo()(fn, ctx);

    const obj = {};
    ctx.runInitializers(obj);
    const method = (obj as Record<string, (...a: unknown[]) => unknown>).circular2;

    const a: Record<string, unknown> = {};
    a.self = a;
    const b: Record<string, unknown> = {};
    b.self = b;

    method(a);
    method(b);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("undefined vs null as arguments produce different cache keys", () => {
    const fn = vi.fn((x: unknown) => x);
    const ctx = mockCtx("nullUndef");
    Memo()(fn, ctx);

    const obj = {};
    ctx.runInitializers(obj);
    const method = (obj as Record<string, (...a: unknown[]) => unknown>).nullUndef;

    method(undefined);
    method(null);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("BigInt argument does not crash JSON.stringify path", () => {
    const fn = vi.fn((x: unknown) => x);
    const ctx = mockCtx("bigint");
    Memo()(fn, ctx);

    const obj = {};
    ctx.runInitializers(obj);
    const method = (obj as Record<string, (...a: unknown[]) => unknown>).bigint;

    // BigInt is a non-object, non-symbol primitive — goes through String() path
    expect(() => method(BigInt(42))).not.toThrow();
    method(BigInt(42));
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
