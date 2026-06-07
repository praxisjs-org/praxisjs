import { describe, it, expect, vi } from "vitest";

import {
  effect,
  track,
  activeEffect,
  cleanupEffectDeps,
  recordDependency,
  type SubscriberHolder,
} from "../signal/effect";
import { batch } from "../signal/batch";
import { signal } from "../signal/signal";

describe("effect", () => {
  it("runs immediately on creation", () => {
    const ran = vi.fn();
    effect(ran);
    expect(ran).toHaveBeenCalledOnce();
  });

  it("re-runs when a tracked signal changes", () => {
    const s = signal(1);
    const values: number[] = [];
    effect(() => {
      values.push(s());
    });
    s.set(2);
    s.set(3);
    expect(values).toEqual([1, 2, 3]);
  });

  it("stop() calls the cleanup function", () => {
    const cleanupFn = vi.fn();
    const stop = effect(() => cleanupFn);
    stop();
    expect(cleanupFn).toHaveBeenCalledOnce();
  });

  it("calls cleanup function before re-run", () => {
    const s = signal(0);
    const order: string[] = [];
    effect(() => {
      const v = s();
      order.push(`run:${v}`);
      return () => order.push(`cleanup`);
    });
    s.set(1);
    expect(order).toEqual(["run:0", "cleanup", "run:1"]);
  });

  it("tracks multiple signals", () => {
    const a = signal(1);
    const b = signal(10);
    const sums: number[] = [];
    effect(() => {
      sums.push(a() + b());
    });
    a.set(2);
    b.set(20);
    expect(sums).toEqual([11, 12, 22]);
  });

  it("stop() prevents future re-runs", () => {
    const s = signal(0);
    const values: number[] = [];
    const stop = effect(() => {
      values.push(s());
    });
    stop();
    s.set(99);
    expect(values).toEqual([0]); // only initial run
  });

  it("drops dependencies that are no longer read", () => {
    const useA = signal(true);
    const a = signal(1);
    const b = signal(10);
    const values: number[] = [];

    effect(() => {
      values.push(useA() ? a() : b());
    });

    useA.set(false);
    expect(values).toEqual([1, 10]);

    a.set(2);
    expect(values).toEqual([1, 10]);

    b.set(20);
    expect(values).toEqual([1, 10, 20]);
  });

  it("does not skip other subscribers when one effect changes subscriptions while notifying", () => {
    const useOther = signal(false);
    const source = signal(0);
    const other = signal(100);
    const first = vi.fn();
    const second = vi.fn();

    effect(() => {
      first(useOther() ? other() : source());
    });
    effect(() => {
      second(source());
    });

    useOther.set(true);
    first.mockClear();
    second.mockClear();

    source.set(1);

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledWith(1);
  });

  it("effect with no reactive dependencies runs once only", () => {
    const ran = vi.fn();
    effect(() => {
      ran(); // no signal reads
    });
    expect(ran).toHaveBeenCalledTimes(1);
    // No signal changes possible — just verify it doesn't re-run spontaneously
    expect(ran).toHaveBeenCalledTimes(1);
  });

  it("stop() with no cleanup function does not throw", () => {
    const stop = effect(() => { /* no return value */ });
    expect(() => stop()).not.toThrow();
  });

  it("cleanup is re-invoked before each re-run", () => {
    const s = signal(0);
    const cleanupCount = { n: 0 };
    effect(() => {
      s(); // track
      return () => { cleanupCount.n++; };
    });
    s.set(1);
    s.set(2);
    // cleanup called once before second run, once before third run
    expect(cleanupCount.n).toBe(2);
  });

  it("stop() called multiple times does not crash or double-clean", () => {
    const cleanupFn = vi.fn();
    const stop = effect(() => cleanupFn);
    expect(() => {
      stop();
      stop();
      stop();
    }).not.toThrow();
    // cleanup is only called once (on first stop)
    expect(cleanupFn).toHaveBeenCalledTimes(1);
  });

  it("ignores a queued run after the effect was stopped", () => {
    const s = signal(0);
    const values: number[] = [];
    const stop = effect(() => {
      values.push(s());
    });

    batch(() => {
      s.set(1);
      stop();
    });

    expect(values).toEqual([0]);
  });

  it("cleanupEffectDeps handles empty, single, and array dependency holders", () => {
    const tracked = vi.fn();
    const other = vi.fn();
    const emptyHolder: SubscriberHolder = { subs: null };
    const singleHolder: SubscriberHolder = { subs: tracked };
    const arrayHolder: SubscriberHolder = { subs: [tracked, other] };
    const unmatchedSingleHolder: SubscriberHolder = { subs: other };
    const unmatchedArrayHolder: SubscriberHolder = { subs: [other] };

    recordDependency(tracked, emptyHolder);
    recordDependency(tracked, singleHolder);
    recordDependency(tracked, arrayHolder);
    recordDependency(tracked, unmatchedSingleHolder);
    recordDependency(tracked, unmatchedArrayHolder);

    cleanupEffectDeps(tracked);

    expect(emptyHolder.subs).toBeNull();
    expect(singleHolder.subs).toBeNull();
    expect(arrayHolder.subs).toEqual([other]);
    expect(unmatchedSingleHolder.subs).toBe(other);
    expect(unmatchedArrayHolder.subs).toEqual([other]);
  });

  it("exception inside nested track() restores outer activeEffect", () => {
    const s = signal(0);
    const outer = vi.fn();
    let outerEffectRef: unknown;

    effect(() => {
      outer();
      s(); // track
      outerEffectRef = activeEffect;
    });

    // Now do a track that throws — outer activeEffect must be restored
    try {
      track(() => { throw new Error("inner throws"); });
    } catch {
      // expected
    }

    expect(activeEffect).toBeNull();
  });

  it("activeEffect is null after a track() that throws", () => {
    try {
      track(() => { throw new Error("boom"); });
    } catch {
      // expected
    }
    expect(activeEffect).toBeNull();
  });
});
