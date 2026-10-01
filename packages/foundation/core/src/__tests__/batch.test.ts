import { describe, it, expect, vi } from "vitest";

import { batch } from "../signal/batch";
import { effect } from "../signal/effect";
import { signal } from "../signal/signal";

describe("batch", () => {
  it("executes the wrapped function", () => {
    const s = signal(0);
    batch(() => {
      s.set(5);
      s.set(10);
    });
    expect(s()).toBe(10);
  });

  it("does not throw when no effects are tracking", () => {
    const s = signal(0);
    expect(() => { batch(() => { s.set(1); }); }).not.toThrow();
    expect(s()).toBe(1);
  });

  it("propagates errors thrown inside the batch", () => {
    expect(() =>
      { batch(() => {
        throw new Error("inside batch");
      }); },
    ).toThrow("inside batch");
  });

  it("nested batch() — effects run exactly once after outer batch completes", () => {
    const s = signal(0);
    const runs: number[] = [];
    effect(() => { runs.push(s()); });
    // initial run captured
    const before = runs.length;

    batch(() => {
      batch(() => {
        s.set(1);
        s.set(2);
      });
      s.set(3);
    });

    // effect should have run exactly once for the final value
    expect(runs.length).toBe(before + 1);
    expect(runs[runs.length - 1]).toBe(3);
  });

  it("batch() that throws still cleans up state (no stuck batchQueue)", () => {
    const s = signal(0);
    const runs: number[] = [];
    effect(() => { runs.push(s()); });

    expect(() =>
      batch(() => {
        s.set(1);
        throw new Error("batch boom");
      }),
    ).toThrow("batch boom");

    // After the failed batch, the queue must be cleared so subsequent
    // signal changes work normally (not deferred indefinitely).
    const countBefore = runs.length;
    s.set(99);
    expect(runs.length).toBe(countBefore + 1);
    expect(runs[runs.length - 1]).toBe(99);
  });

  it("effect added inside a running batch is included in the drain", () => {
    const s = signal(0);
    const seen: number[] = [];

    batch(() => {
      // Create an effect inside the batch — it runs immediately (initial run)
      // and registers itself as a subscriber. Then we set the signal so it
      // gets enqueued into the batch queue.
      effect(() => { seen.push(s()); });
      s.set(5);
    });

    // The effect should have captured both the initial value and the batched value
    expect(seen).toContain(0);
    expect(seen).toContain(5);
  });

  it("an effect fed by several signals runs once per batch", () => {
    const a = signal(0);
    const b = signal(0);
    const runs = vi.fn();
    effect(() => {
      void a();
      void b();
      runs();
    });
    runs.mockClear();
    batch(() => {
      a.set(1);
      b.set(1);
      a.set(2);
    });
    expect(runs).toHaveBeenCalledOnce();
  });

  it("a throwing effect does not stop the others and the error is rethrown after the flush", () => {
    const s = signal(0);
    const after = vi.fn();
    let armed = false;
    effect(() => {
      void s();
      if (armed) throw new Error("effect boom");
    });
    effect(() => {
      void s();
      if (armed) after();
    });
    armed = true;
    expect(() => { batch(() => { s.set(1); }); }).toThrow("effect boom");
    expect(after).toHaveBeenCalledOnce();
  });

  it("a failed flush leaves no stale entries for the next batch", () => {
    const s = signal(0);
    const runs = vi.fn();
    let throws = true;
    effect(() => {
      void s();
      runs();
      if (throws && s() === 1) throw new Error("once");
    });
    expect(() => { batch(() => { s.set(1); }); }).toThrow("once");
    throws = false;
    runs.mockClear();
    batch(() => { s.set(2); });
    expect(runs).toHaveBeenCalledOnce();
  });
});
