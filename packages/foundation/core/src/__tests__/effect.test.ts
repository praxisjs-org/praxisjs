import { describe, it, expect, vi } from "vitest";

import { effect } from "../signal/effect";
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
});
