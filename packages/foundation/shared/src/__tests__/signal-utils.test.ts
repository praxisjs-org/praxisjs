import { describe, it, expect } from "vitest";

import { isSignal, isComputed, isReactive } from "../signal";

function fakeSignal() {
  const fn = () => 0;
  (fn as unknown as Record<string, unknown>).__isSignal = true;
  return fn;
}

function fakeComputed() {
  const fn = () => 0;
  (fn as unknown as Record<string, unknown>).__isComputed = true;
  return fn;
}

describe("isSignal", () => {
  it("returns true for a signal-shaped function", () => {
    expect(isSignal(fakeSignal())).toBe(true);
  });

  it("returns false for a plain function", () => {
    expect(isSignal(() => 0)).toBe(false);
  });

  it("returns false for non-functions", () => {
    expect(isSignal(42)).toBe(false);
    expect(isSignal(null)).toBe(false);
    expect(isSignal({})).toBe(false);
    expect(isSignal("string")).toBe(false);
  });

  it("returns false for a computed (no __isSignal)", () => {
    expect(isSignal(fakeComputed())).toBe(false);
  });
});

describe("isComputed", () => {
  it("returns true for a computed-shaped function", () => {
    expect(isComputed(fakeComputed())).toBe(true);
  });

  it("returns false for a plain function", () => {
    expect(isComputed(() => 0)).toBe(false);
  });

  it("returns false for non-functions", () => {
    expect(isComputed(0)).toBe(false);
    expect(isComputed(null)).toBe(false);
  });
});

describe("isReactive", () => {
  it("returns true for a signal", () => {
    expect(isReactive(fakeSignal())).toBe(true);
  });

  it("returns true for a computed", () => {
    expect(isReactive(fakeComputed())).toBe(true);
  });

  it("returns false for a plain function", () => {
    expect(isReactive(() => 0)).toBe(false);
  });

  it("returns false for non-functions", () => {
    expect(isReactive(null)).toBe(false);
    expect(isReactive(123)).toBe(false);
  });
});
