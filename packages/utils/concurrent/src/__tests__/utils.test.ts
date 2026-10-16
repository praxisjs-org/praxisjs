import { describe, it, expect, vi } from "vitest";
import { effect, SignalNode, writeSignal } from "@praxisjs/core/internal";

import { acceptsSignal, readonlyView, toError } from "../utils";

describe("acceptsSignal", () => {
  it("returns true for a function with 'signal' as first param", () => {
    expect(acceptsSignal((signal: AbortSignal) => signal)).toBe(true);
  });

  it("returns true for an async function with 'signal' as first param", () => {
    expect(acceptsSignal(async (signal: AbortSignal, id: number) => ({ signal, id }))).toBe(true);
  });

  it("returns true for a named function with 'signal' as first param", () => {
    function loadUser(signal: AbortSignal) { return signal; }
    expect(acceptsSignal(loadUser)).toBe(true);
  });

  it("returns false for a function with no params", () => {
    expect(acceptsSignal(() => "ok")).toBe(false);
  });

  it("returns false for a function whose first param is not 'signal'", () => {
    expect(acceptsSignal((id: number) => id)).toBe(false);
  });

  it("returns false for _signal (underscore-prefixed)", () => {
    expect(acceptsSignal((_signal: AbortSignal) => _signal)).toBe(false);
  });

  it("returns false when fn.toString() contains no parentheses (regex yields no match)", () => {
    const noParenFn = Object.assign(
      () => undefined,
      { toString() { return "no parens here"; } },
    ) as unknown as () => unknown;

    expect(acceptsSignal(noParenFn)).toBe(false);
  });

  it("returns false when fn.toString() throws", () => {
    const badFn = Object.assign(
      () => undefined,
      { toString() { throw new Error("no source"); } },
    ) as unknown as () => unknown;

    expect(acceptsSignal(badFn)).toBe(false);
  });
});

describe("acceptsSignal — cache", () => {
  it("reads a function's source once, however often it is asked", () => {
    async function load(signal: AbortSignal, id: number) { return { signal, id }; }
    const toString = vi.spyOn(load as { toString(): string }, "toString");
    expect(acceptsSignal(load)).toBe(true);
    expect(acceptsSignal(load)).toBe(true);
    expect(acceptsSignal(load)).toBe(true);
    expect(toString).toHaveBeenCalledTimes(1);
  });

  it("caches negative results too", () => {
    const fn = (id: number) => id;
    const toString = vi.spyOn(fn as { toString(): string }, "toString");
    expect(acceptsSignal(fn)).toBe(false);
    expect(acceptsSignal(fn)).toBe(false);
    expect(toString).toHaveBeenCalledTimes(1);
  });
});

describe("readonlyView", () => {
  it("reads the node's current value and is marked as a computed", () => {
    const node = new SignalNode(1);
    const view = readonlyView(node);
    expect(view()).toBe(1);
    writeSignal(node, 2);
    expect(view()).toBe(2);
    expect(view.__isComputed).toBe(true);
  });

  it("is tracked by effects that read it", () => {
    const node = new SignalNode("a");
    const view = readonlyView(node);
    const seen: string[] = [];
    const stop = effect(() => { seen.push(view()); });
    writeSignal(node, "b");
    stop();
    writeSignal(node, "c");
    expect(seen).toEqual(["a", "b"]);
  });

  it("subscribe() calls back on every change, untracked, until unsubscribed", () => {
    const node = new SignalNode(0);
    const other = new SignalNode(0);
    const view = readonlyView(node);
    const fn = vi.fn((value: number) => { void readonlyView(other)(); return value; });
    const unsubscribe = view.subscribe(fn);
    writeSignal(node, 1);
    writeSignal(other, 1);
    unsubscribe();
    writeSignal(node, 2);
    expect(fn.mock.calls.map(([v]) => v)).toEqual([0, 1]);
  });
});

describe("toError", () => {
  it("keeps Errors and wraps anything else", () => {
    const err = new Error("x");
    expect(toError(err)).toBe(err);
    expect(toError("boom").message).toBe("boom");
  });
});
