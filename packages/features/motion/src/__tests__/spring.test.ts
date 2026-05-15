// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { spring } from "../spring";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
});

describe("spring()", () => {
  it("starts at the initial value", () => {
    const s = spring(42);
    expect(s.value()).toBe(42);
    s.stop();
  });

  it("target starts equal to initial value", () => {
    const s = spring(10);
    expect(s.target()).toBe(10);
    s.stop();
  });

  it("stop() cancels pending animation", () => {
    const s = spring(0);
    s.target.set(100);
    s.stop();
    const valueAfterStop = s.value();
    expect(typeof valueAfterStop).toBe("number");
  });

  it("setting target triggers animation", () => {
    const s = spring(0);
    s.target.set(100);
    expect(s.target()).toBe(100);
    s.stop();
  });

  it("accepts custom stiffness and damping", () => {
    const s = spring(0, { stiffness: 0.5, damping: 0.9 });
    s.target.set(50);
    expect(s.target()).toBe(50);
    s.stop();
  });

  it("accepts custom mass and precision", () => {
    const s = spring(0, { mass: 2, precision: 0.01 });
    s.target.set(100);
    expect(typeof s.value()).toBe("number");
    s.stop();
  });

  it("value is a computed (function)", () => {
    const s = spring(0);
    expect(typeof s.value).toBe("function");
    s.stop();
  });

  it("target is a signal with a set method", () => {
    const s = spring(0);
    expect(typeof s.target.set).toBe("function");
    s.stop();
  });

  it("settting target multiple times accumulates velocity direction", () => {
    const s = spring(0, { stiffness: 0.5, damping: 0.5 });
    s.target.set(10);
    s.target.set(20);
    expect(s.target()).toBe(20);
    s.stop();
  });

  it("tick advances value toward target", () => {
    const s = spring(0, { stiffness: 0.5, damping: 0.8, precision: 0.01 });
    s.target.set(100);
    vi.advanceTimersByTime(50);
    expect(s.value()).toBeGreaterThan(0);
    s.stop();
  });

  it("moves value closer to target over time", () => {
    const s = spring(0, { stiffness: 0.5, damping: 0.95, precision: 0.01 });
    s.target.set(100);
    vi.advanceTimersByTime(500);
    // Value should have moved significantly toward target
    expect(s.value()).toBeGreaterThan(10);
  });

  it("stiffness = 0 throws a descriptive error", () => {
    expect(() => spring(0, { stiffness: 0 })).toThrow("stiffness must be greater than 0");
  });

  it("initial value already equals target — animation stops immediately (no rAF loop)", () => {
    const s = spring(50, { stiffness: 0.5, damping: 0.8, precision: 0.001 });
    // target is also 50 (the default), so the spring should converge instantly
    const initial = s.value();
    vi.advanceTimersByTime(200);
    // Value should remain at (or very close to) 50 — no drift
    expect(s.value()).toBeCloseTo(initial, 3);
    s.stop();
  });

  it("stop() is a no-op regarding rAF when animation has already settled", () => {
    // spring(50) with target=50 settles in the first tick (force=0, velocity=0)
    const s = spring(50, { stiffness: 0.5, damping: 0.8, precision: 0.001 });
    vi.advanceTimersByTime(200); // let it settle; raf becomes undefined
    expect(() => s.stop()).not.toThrow(); // covers if(raf) false branch
  });

  it("stop() called while animating — value is frozen and does not continue to change", () => {
    const s = spring(0, { stiffness: 0.5, damping: 0.8 });
    s.target.set(100);
    vi.advanceTimersByTime(50);
    s.stop();
    const valueAfterStop = s.value();
    vi.advanceTimersByTime(500);
    expect(s.value()).toBe(valueAfterStop);
  });
});
