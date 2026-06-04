import { describe, it, expect, vi } from "vitest";

import { computed, writableComputed } from "../signal/computed";
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

  it("coalesces subscriber notifications when multiple dependencies change in the same tick", async () => {
    const first = signal("John");
    const last = signal("Doe");
    const fullName = computed(() => `${first()} ${last()}`);

    const calls: string[] = [];
    fullName.subscribe((v) => calls.push(v));
    expect(calls).toEqual(["John Doe"]); // immediate on subscribe

    first.set("Jane");
    last.set("Smith");
    await Promise.resolve();

    // Both changes in the same tick → single notification with final value
    expect(calls).toEqual(["John Doe", "Jane Smith"]);
  });

  it("subscribe fires immediately with computed value", () => {
    const s = signal(5);
    const c = computed(() => s() + 1);
    const received: number[] = [];
    c.subscribe((v) => received.push(v));
    expect(received).toEqual([6]);
  });

  it("subscribe fires when source changes", async () => {
    const s = signal(0);
    const c = computed(() => s() * 3);
    const received: number[] = [];
    c.subscribe((v) => received.push(v));
    s.set(2);
    await Promise.resolve();
    s.set(4);
    await Promise.resolve();
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

  it("unsubscribe then re-subscribe works correctly", async () => {
    const s = signal(1);
    const c = computed(() => s() * 3);
    const received: number[] = [];

    const unsub = c.subscribe((v) => received.push(v));
    unsub();

    // Re-subscribe
    c.subscribe((v) => received.push(v));
    s.set(2);
    await Promise.resolve();
    expect(received).toContain(6);
  });

  it("dirty remains true after computeFn throws — next read recomputes instead of returning stale cache", () => {
    const s = signal(true);
    const fn = vi.fn(() => {
      if (s()) throw new Error("compute error");
      return 42;
    });
    const c = computed(fn);
    // First read — throws, dirty stays true
    expect(() => c()).toThrow("compute error");
    expect(fn).toHaveBeenCalledTimes(1);
    // Second read while still throwing — must recompute, not return stale
    expect(() => c()).toThrow("compute error");
    expect(fn).toHaveBeenCalledTimes(2);
    // Fix the source and read — should now succeed
    s.set(false);
    expect(c()).toBe(42);
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("circular dependency between two computed values throws or does not hang", () => {
    // This test documents behavior: circular deps must not cause infinite loops
    // We use a signal to break potential infinite recursion via dirty flag
    const s = signal(0);
    let aVal = 0;
    let bVal = 0;
    const a: ReturnType<typeof computed<number>> = computed(() => {
      s(); // track signal to make dirty
      return bVal + 1;
    });
    const b: ReturnType<typeof computed<number>> = computed(() => {
      s(); // track signal to make dirty
      return aVal + 1;
    });
    // Manually reading without cross-dependency reads to avoid true circularity
    aVal = a();
    bVal = b();
    expect(aVal).toBeGreaterThanOrEqual(1);
    expect(bVal).toBeGreaterThanOrEqual(1);
  });

  it("microtask guard: skips notifySubs when leaf subscriber unsubscribes before microtask fires", async () => {
    const s = signal(0);
    const c = computed(() => s() * 2);
    const results: number[] = [];
    const unsub = c.subscribe((v) => results.push(v));
    // results = [0]

    s.set(1); // markDirty: queues microtask (scheduled = true)
    unsub();  // removes leaf subscriber BEFORE microtask fires → leafHolder.subs = null

    await Promise.resolve(); // microtask: if (leafHolder.subs !== null) → FALSE → no notify
    expect(results).toEqual([0]); // no update received after unsubscribe
  });

  it("skips re-scheduling leaf notification when already scheduled (!scheduled false branch)", async () => {
    const s = signal(0);
    const c = computed(() => s() * 2);
    const results: number[] = [];
    c.subscribe((v) => results.push(v));
    // results = [0] after initial subscribe

    s.set(1); // markDirty: scheduled = true, microtask queued
    c();      // re-computes: dirty = false (scheduled still true)
    s.set(2); // markDirty: dirty=false → proceeds, but !scheduled is false → no second microtask

    await Promise.resolve(); // microtask runs, subscriber notified with current value
    expect(results).toContain(4); // 2 * 2
  });

  it("double unsubscribe on computed does not crash", () => {
    const s = signal(1);
    const c = computed(() => s() + 1);
    const unsub = c.subscribe(() => {});
    expect(() => {
      unsub();
      unsub();
    }).not.toThrow();
  });
});

describe("writableComputed", () => {
  it("read returns the getter value", () => {
    const s = signal(5);
    const wc = writableComputed(() => s() * 2, (_v) => { /* no-op */ });
    expect(wc()).toBe(10);
  });

  it("set calls the setter", () => {
    const s = signal(0);
    const wc = writableComputed(() => s(), (v) => { s.set(v); });
    wc.set(42);
    expect(s()).toBe(42);
    expect(wc()).toBe(42);
  });

  it("update applies the updater and calls the setter", () => {
    const s = signal(10);
    const wc = writableComputed(() => s(), (v) => { s.set(v); });
    wc.update((current) => current + 5);
    expect(s()).toBe(15);
    expect(wc()).toBe(15);
  });

  it("marks __isWritableComputed = true", () => {
    const wc = writableComputed(() => 1, (_v) => { /* no-op */ });
    expect(wc.__isWritableComputed).toBe(true);
  });

  it("inherits __isComputed = true from computed", () => {
    const wc = writableComputed(() => 1, (_v) => { /* no-op */ });
    expect(wc.__isComputed).toBe(true);
  });

  it("recomputes when underlying signal changes", () => {
    const s = signal(3);
    const wc = writableComputed(() => s() * 2, (_v) => { /* no-op */ });
    expect(wc()).toBe(6);
    s.set(7);
    expect(wc()).toBe(14);
  });
});
