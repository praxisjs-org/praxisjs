import { describe, it, expect } from "vitest";

import { easings, resolveEasing } from "../easings";

const EPSILON = 1e-6;

function nearly(a: number, b: number) {
  return Math.abs(a - b) < EPSILON;
}

describe("easings", () => {
  describe("boundary conditions (t=0 → 0, t=1 → 1)", () => {
    for (const [name, fn] of Object.entries(easings)) {
      it(`${name}(0) === 0`, () => {
        expect(nearly(fn(0), 0)).toBe(true);
      });
      it(`${name}(1) === 1`, () => {
        expect(nearly(fn(1), 1)).toBe(true);
      });
    }
  });

  describe("linear", () => {
    it("returns t unchanged", () => {
      expect(easings.linear(0.5)).toBe(0.5);
      expect(easings.linear(0.25)).toBe(0.25);
    });
  });

  describe("easeIn", () => {
    it("is slower at start than end (t² curve)", () => {
      expect(easings.easeIn(0.25)).toBeLessThan(0.25);
    });
  });

  describe("easeOut", () => {
    it("is faster at start than end", () => {
      expect(easings.easeOut(0.75)).toBeGreaterThan(0.75);
    });
  });

  describe("easeInOut", () => {
    it("is symmetric around 0.5", () => {
      const v = easings.easeInOut(0.5);
      expect(nearly(v, 0.5)).toBe(true);
    });
  });

  describe("easeInCubic", () => {
    it("is t³", () => {
      expect(nearly(easings.easeInCubic(0.5), 0.125)).toBe(true);
    });
  });

  describe("bounce", () => {
    it("stays within [0, 1] for t in [0, 1]", () => {
      for (let t = 0; t <= 1; t += 0.1) {
        const v = easings.bounce(t);
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(1 + EPSILON);
      }
    });
  });

  describe("elastic", () => {
    it("returns 0 at t=0 and 1 at t=1", () => {
      expect(easings.elastic(0)).toBe(0);
      expect(easings.elastic(1)).toBe(1);
    });
  });
});

describe("resolveEasing", () => {
  it("resolves a string key to the easing function", () => {
    const fn = resolveEasing("linear");
    expect(fn).toBe(easings.linear);
  });

  it("passes through a custom function", () => {
    const custom = (t: number) => t * t * t;
    expect(resolveEasing(custom)).toBe(custom);
  });
});
