import { describe, it, expect, vi } from "vitest";

import { computed } from "../signal/computed";
import { signal } from "../signal/signal";

describe("computed", () => {
  it("derives value from signal", () => {
    const s = signal(4);
    const doubled = computed(() => s() * 2);
    expect(doubled()).toBe(8);
  });

  it("updates when source signal changes", () => {
    const s = signal(3);
    const triple = computed(() => s() * 3);
    s.set(5);
    expect(triple()).toBe(15);
  });

  it("is lazy — does not recompute until accessed", () => {
    const s = signal(1);
    const fn = vi.fn(() => s() + 1);
    const c = computed(fn);
    expect(fn).not.toHaveBeenCalled();
    c();
    expect(fn).toHaveBeenCalledOnce();
  });

  it("caches value between reads when source has not changed", () => {
    const s = signal(2);
    const fn = vi.fn(() => s() * 10);
    const c = computed(fn);
    c();
    c();
    expect(fn).toHaveBeenCalledOnce();
  });

  it("recomputes after source change", () => {
    const s = signal(1);
    const fn = vi.fn(() => s() + 100);
    const c = computed(fn);
    c();
    s.set(2);
    c();
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("marks __isComputed = true", () => {
    const c = computed(() => 42);
    expect(c.__isComputed).toBe(true);
  });

  it("chained computed values update correctly", () => {
    const s = signal(1);
    const doubled = computed(() => s() * 2);
    const quadrupled = computed(() => doubled() * 2);
    expect(quadrupled()).toBe(4);
    s.set(3);
    expect(quadrupled()).toBe(12);
  });

  it("subscribe fires immediately with computed value", () => {
    const s = signal(5);
    const c = computed(() => s() + 1);
    const received: number[] = [];
    c.subscribe((v) => received.push(v));
    expect(received).toEqual([6]);
  });

  it("subscribe fires when source changes", () => {
    const s = signal(0);
    const c = computed(() => s() * 3);
    const received: number[] = [];
    c.subscribe((v) => received.push(v));
    s.set(2);
    s.set(4);
    expect(received).toEqual([0, 6, 12]);
  });

  it("unsubscribe stops receiving updates", () => {
    const s = signal(0);
    const c = computed(() => s() + 1);
    const received: number[] = [];
    const unsub = c.subscribe((v) => received.push(v));
    unsub();
    s.set(10);
    expect(received).toEqual([1]);
  });

  it("computeFn that throws propagates the error on read", () => {
    const s = signal(true);
    const c = computed(() => {
      if (s()) throw new Error("compute error");
      return 0;
    });
    expect(() => c()).toThrow("compute error");
  });

  it("dynamic dependency: switches tracked signal based on condition", () => {
    const toggle = signal(true);
    const a = signal(10);
    const b = signal(20);
    const c = computed(() => (toggle() ? a() : b()));

    expect(c()).toBe(10);
    a.set(11);
    expect(c()).toBe(11);

    toggle.set(false);
    expect(c()).toBe(20);
    b.set(21);
    expect(c()).toBe(21);
  });

  it("unsubscribe then re-subscribe works correctly", () => {
    const s = signal(1);
    const c = computed(() => s() * 3);
    const received: number[] = [];

    const unsub = c.subscribe((v) => received.push(v));
    unsub();

    // Re-subscribe
    c.subscribe((v) => received.push(v));
    s.set(2);
    expect(received).toContain(6);
  });
});
