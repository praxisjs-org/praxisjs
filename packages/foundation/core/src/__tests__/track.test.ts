import { describe, it, expect, vi } from "vitest";

import { track, runEffect, activeEffect } from "../signal/effect";
import { signal } from "../signal/signal";

describe("track", () => {
  it("runs the effect immediately", () => {
    const fn = vi.fn();
    track(fn);
    expect(fn).toHaveBeenCalledOnce();
  });

  it("sets activeEffect during execution, resets after", () => {
    let during: unknown = "not-set";
    track(() => {
      during = activeEffect;
    });
    expect(during).toBeTypeOf("function");
    expect(activeEffect).toBeNull();
  });

  it("supports nested track calls — restores outer effect", () => {
    const outer = vi.fn();
    const inner = vi.fn();
    let outerActive: unknown;
    let innerActive: unknown;

    track(() => {
      outer();
      outerActive = activeEffect;
      track(() => {
        inner();
        innerActive = activeEffect;
      });
      // after inner track, activeEffect should be back to outer
      expect(activeEffect).toBe(outerActive);
    });

    expect(outer).toHaveBeenCalledOnce();
    expect(inner).toHaveBeenCalledOnce();
    expect(innerActive).not.toBe(outerActive);
  });

  it("subscribes the tracked effect to signals read inside it", () => {
    const s = signal(1);
    const values: number[] = [];
    track(() => values.push(s()));
    s.set(2);
    expect(values).toEqual([1, 2]);
  });
});

describe("runEffect", () => {
  it("sets activeEffect to the given value", () => {
    const fn = () => {};
    runEffect(fn);
    expect(activeEffect).toBe(fn);
    runEffect(null);
    expect(activeEffect).toBeNull();
  });
});
