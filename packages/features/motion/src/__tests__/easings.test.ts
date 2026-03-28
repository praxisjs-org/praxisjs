import { describe, it, expect } from "vitest";

import { easings, resolveEasing } from "../easings";

describe("easings.linear", () => {
  it("returns 0 at t=0", () => expect(easings.linear(0)).toBe(0));
  it("returns 0.5 at t=0.5", () => expect(easings.linear(0.5)).toBe(0.5));
  it("returns 1 at t=1", () => expect(easings.linear(1)).toBe(1));
});

describe("easings.easeIn", () => {
  it("returns 0 at t=0", () => expect(easings.easeIn(0)).toBe(0));
  it("returns 0.25 at t=0.5", () => expect(easings.easeIn(0.5)).toBe(0.25));
  it("returns 1 at t=1", () => expect(easings.easeIn(1)).toBe(1));
});

describe("easings.easeOut", () => {
  it("returns 0 at t=0", () => expect(easings.easeOut(0)).toBe(0));
  it("returns 0.75 at t=0.5", () => expect(easings.easeOut(0.5)).toBe(0.75));
  it("returns 1 at t=1", () => expect(easings.easeOut(1)).toBe(1));
});

describe("easings.easeInOut", () => {
  it("returns 0 at t=0", () => expect(easings.easeInOut(0)).toBe(0));
  it("returns 0.5 at t=0.5", () => expect(easings.easeInOut(0.5)).toBe(0.5));
  it("returns 1 at t=1", () => expect(easings.easeInOut(1)).toBe(1));
  it("uses easeIn branch for t<0.5", () => {
    expect(easings.easeInOut(0.25)).toBeCloseTo(0.125);
  });
  it("uses easeOut branch for t>=0.5", () => {
    expect(easings.easeInOut(0.75)).toBeCloseTo(0.875);
  });
});

describe("easings.easeInCubic", () => {
  it("returns 0 at t=0", () => expect(easings.easeInCubic(0)).toBe(0));
  it("returns 0.125 at t=0.5", () => expect(easings.easeInCubic(0.5)).toBe(0.125));
  it("returns 1 at t=1", () => expect(easings.easeInCubic(1)).toBe(1));
});

describe("easings.bounce", () => {
  it("returns 0 at t=0", () => expect(easings.bounce(0)).toBe(0));
  it("returns 1 at t=1", () => expect(easings.bounce(1)).toBeCloseTo(1));
  it("handles first branch (t < 1/2.75)", () => {
    const t = 0.2;
    expect(easings.bounce(t)).toBeGreaterThan(0);
  });
  it("handles second branch (t < 2/2.75)", () => {
    const t = 0.5;
    expect(easings.bounce(t)).toBeGreaterThan(0.7);
  });
  it("handles third branch (t < 2.5/2.75)", () => {
    const t = 0.85;
    expect(easings.bounce(t)).toBeGreaterThan(0.9);
  });
  it("handles fourth branch (t >= 2.5/2.75)", () => {
    const t = 0.97;
    expect(easings.bounce(t)).toBeGreaterThan(0.98);
  });
});

describe("easings.elastic", () => {
  it("returns 0 at t=0", () => expect(easings.elastic(0)).toBe(0));
  it("returns 1 at t=1", () => expect(easings.elastic(1)).toBe(1));
  it("returns a negative value mid-range (overshoot)", () => {
    expect(easings.elastic(0.5)).toBeLessThan(0);
  });
});

describe("resolveEasing", () => {
  it("resolves a named easing", () => {
    const fn = resolveEasing("linear");
    expect(fn(0.5)).toBe(0.5);
  });

  it("returns a custom function as-is", () => {
    const custom = (t: number) => t * 2;
    const fn = resolveEasing(custom);
    expect(fn).toBe(custom);
    expect(fn(0.5)).toBe(1);
  });

  it("resolves all named easings", () => {
    const names = ["linear", "easeIn", "easeOut", "easeInOut", "easeInCubic", "bounce", "elastic"] as const;
    for (const name of names) {
      const fn = resolveEasing(name);
      expect(typeof fn).toBe("function");
    }
  });
});
