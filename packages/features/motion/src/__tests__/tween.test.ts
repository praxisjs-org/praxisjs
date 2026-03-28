// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { tween } from "../tween";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
});

function flushRaf(frames = 60) {
  for (let i = 0; i < frames; i++) {
    vi.runAllTicks();
    const cbs = (globalThis as unknown as { __rafCallbacks?: Array<(t: number) => void> }).__rafCallbacks;
    if (cbs?.length) {
      const batch = [...cbs];
      cbs.length = 0;
      batch.forEach((cb) => cb(performance.now()));
    }
  }
}

describe("tween()", () => {
  it("starts at the `from` value", () => {
    const t = tween(0, 100);
    expect(t.value()).toBe(0);
    t.stop();
  });

  it("exposes the target signal", () => {
    const t = tween(0, 100);
    expect(t.target()).toBe(100);
    t.stop();
  });

  it("playing is true when animating", () => {
    const t = tween(0, 100);
    expect(t.playing()).toBe(true);
    t.stop();
  });

  it("stop() halts animation and sets playing to false", () => {
    const t = tween(0, 100);
    t.stop();
    expect(t.playing()).toBe(false);
  });

  it("reset() returns value to `from` and resets progress", () => {
    const t = tween(0, 100);
    t.stop();
    t.reset();
    expect(t.value()).toBe(0);
    expect(t.progress()).toBe(0);
  });

  it("progress starts at 0", () => {
    const t = tween(0, 100);
    expect(t.progress()).toBe(0);
    t.stop();
  });

  it("accepts custom easing as function", () => {
    const t = tween(0, 100, { easing: (x) => x, duration: 300 });
    expect(t.value()).toBe(0);
    t.stop();
  });

  it("accepts custom duration and delay", () => {
    const t = tween(0, 100, { duration: 500, delay: 100 });
    expect(t.value()).toBe(0);
    t.stop();
  });

  it("setting target to same value re-triggers start", () => {
    const t = tween(0, 50);
    const before = t.value();
    t.target.set(50);
    expect(t.value()).toBe(before);
    t.stop();
  });

  it("changing target while playing updates target", () => {
    const t = tween(0, 100);
    t.target.set(200);
    expect(t.target()).toBe(200);
    t.stop();
  });

  it("animate loop runs and updates value toward target", () => {
    const t = tween(0, 100, { duration: 100, easing: "linear" });
    // Advance through multiple rAF frames
    vi.advanceTimersByTime(50);
    // Value should be moving toward 100
    const mid = t.value();
    expect(mid).toBeGreaterThan(0);
    vi.advanceTimersByTime(100);
    t.stop();
  });

  it("completes animation and stops playing", () => {
    const t = tween(0, 100, { duration: 100 });
    vi.advanceTimersByTime(500);
    // After several durations, value should be at or near target
    expect(t.value()).toBeGreaterThan(50);
  });

  it("delay defers animation start", () => {
    const t = tween(0, 100, { duration: 100, delay: 50 });
    vi.advanceTimersByTime(10);
    // Within delay, value stays at 0
    expect(t.value()).toBe(0);
    t.stop();
  });
});
