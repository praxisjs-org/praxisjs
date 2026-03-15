// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";

import { spring } from "../spring";

describe("spring", () => {
  it("initializes value to the starting number", () => {
    vi.useFakeTimers();
    const s = spring(42);
    expect(s.value()).toBe(42);
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it("target signal starts at the initial value", () => {
    vi.useFakeTimers();
    const s = spring(10);
    expect(s.target()).toBe(10);
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it("stop() cancels without throwing", () => {
    vi.useFakeTimers();
    const s = spring(0);
    expect(() => { s.stop(); }).not.toThrow();
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it("stop() can be called multiple times safely", () => {
    vi.useFakeTimers();
    const s = spring(5);
    s.stop();
    expect(() => { s.stop(); }).not.toThrow();
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it("updating target signal triggers animation", () => {
    vi.useFakeTimers();
    const s = spring(0);
    s.target.set(100);
    // Run a few frames
    vi.advanceTimersByTime(100);
    // Value should have moved towards 100
    expect(s.value()).toBeGreaterThan(0);
    s.stop();
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it("accepts custom spring options", () => {
    vi.useFakeTimers();
    const s = spring(0, { stiffness: 0.5, damping: 0.9, mass: 2, precision: 0.01 });
    expect(s.value()).toBe(0);
    vi.clearAllTimers();
    vi.useRealTimers();
  });
});
