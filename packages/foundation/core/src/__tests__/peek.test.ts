import { describe, it, expect } from "vitest";

import { computed } from "../signal/computed";
import { effect } from "../signal/effect";
import { peek } from "../signal/peek";
import { signal } from "../signal/signal";

describe("peek", () => {
  it("returns the current value without tracking", () => {
    const s = signal(42);
    expect(peek(s)).toBe(42);
  });

  it("does not subscribe the active effect when peeked", () => {
    const s = signal(1);
    const runs: number[] = [];

    effect(() => {
      runs.push(peek(s)); // peek — should not subscribe
    });

    s.set(99); // should NOT trigger re-run
    expect(runs).toEqual([1]);
  });

  it("works with computed values", () => {
    const s = signal(5);
    const c = computed(() => s() * 2);
    expect(peek(c)).toBe(10);
  });
});
