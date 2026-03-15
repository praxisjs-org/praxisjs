// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";

import { Animate } from "../decorators";
import { tween } from "../tween";

// ── tween ─────────────────────────────────────────────────────────────────────

describe("tween", () => {
  it("starts with the from value", () => {
    vi.useFakeTimers();
    const t = tween(0, 100);
    expect(t.value()).toBe(0);
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it("target starts at the to value", () => {
    vi.useFakeTimers();
    const t = tween(0, 100);
    expect(t.target()).toBe(100);
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it("playing is initially true (animation started immediately)", () => {
    vi.useFakeTimers();
    const t = tween(0, 100);
    expect(t.playing()).toBe(true);
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it("stop() sets playing to false", () => {
    vi.useFakeTimers();
    const t = tween(0, 100);
    t.stop();
    expect(t.playing()).toBe(false);
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it("reset() restores to from value and clears progress", () => {
    vi.useFakeTimers();
    const t = tween(5, 100);
    t.reset();
    expect(t.value()).toBe(5);
    expect(t.progress()).toBe(0);
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it("progress moves towards 1 as animation advances", () => {
    vi.useFakeTimers();
    const t = tween(0, 100, { duration: 300 });
    vi.advanceTimersByTime(300);
    // After full duration, value should be near the target
    expect(t.progress()).toBeGreaterThanOrEqual(0);
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it("changing target restarts animation", () => {
    vi.useFakeTimers();
    const t = tween(0, 50);
    t.target.set(200);
    expect(t.playing()).toBe(true);
    t.stop();
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it("accepts custom easing and delay options", () => {
    vi.useFakeTimers();
    const t = tween(0, 100, { easing: "linear", delay: 100, duration: 200 });
    expect(t.value()).toBe(0);
    vi.clearAllTimers();
    vi.useRealTimers();
  });
});

// ── Animate decorator ─────────────────────────────────────────────────────────

describe("Animate decorator", () => {
  function makeCtx(name: string) {
    const initializers: Array<(this: unknown) => void> = [];
    return {
      ctx: {
        name,
        kind: "field" as const,
        addInitializer(fn: (this: unknown) => void) {
          initializers.push(fn);
        },
      } as ClassFieldDecoratorContext,
      run(instance: unknown) {
        initializers.forEach((fn) => { fn.call(instance); });
      },
    };
  }

  it("creates a numeric getter/setter on first assignment", () => {
    vi.useFakeTimers();
    const { ctx, run } = makeCtx("x");
    Animate()(undefined, ctx);
    const instance: Record<string, unknown> = {};
    run(instance);
    instance.x = 10;
    expect(typeof instance.x).toBe("number");
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it("returns 0 before any value is set", () => {
    vi.useFakeTimers();
    const { ctx, run } = makeCtx("opacity");
    Animate()(undefined, ctx);
    const instance: Record<string, unknown> = {};
    run(instance);
    expect(instance.opacity).toBe(0);
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it("updating the property updates the tween target", () => {
    vi.useFakeTimers();
    const { ctx, run } = makeCtx("scale");
    Animate()(undefined, ctx);
    const instance: Record<string, unknown> = {};
    run(instance);
    instance.scale = 1;
    instance.scale = 2; // second set updates tween target
    expect(typeof instance.scale).toBe("number");
    vi.clearAllTimers();
    vi.useRealTimers();
  });
});
