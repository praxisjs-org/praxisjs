import { describe, it, expect, vi } from "vitest";

import { history } from "../reactive/history";
import { when, until, debounced } from "../reactive/reactive";
import { computed } from "../signal/computed";
import { signal } from "../signal/signal";

// ---------- when ----------

describe("when", () => {
  it("calls fn immediately when source is already truthy", () => {
    const s = signal<number>(5);
    const fn = vi.fn();
    when(s, fn);
    expect(fn).toHaveBeenCalledWith(5);
  });

  it("calls fn once the source becomes truthy", () => {
    const s = signal<number>(0);
    const fn = vi.fn();
    when(s, fn);
    expect(fn).not.toHaveBeenCalled();
    s.set(1);
    expect(fn).toHaveBeenCalledWith(1);
  });

  it("only fires once, even if source changes again", () => {
    const s = signal(0);
    const fn = vi.fn();
    when(s, fn);
    s.set(1);
    s.set(2);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("does not re-fire after immediate truthy source changes again", () => {
    // Regression: when source is truthy on first run, stop?.() was a no-op
    // because `stop` hadn't been assigned yet. The effect must be cancelled
    // after firing so further source changes do not re-trigger fn.
    const s = signal(1); // immediately truthy
    const fn = vi.fn();
    when(s, fn);
    expect(fn).toHaveBeenCalledTimes(1);
    s.set(2);
    s.set(3);
    expect(fn).toHaveBeenCalledTimes(1); // must still be 1
  });

  it("does not call fn when source stays falsy", () => {
    const s = signal<number>(0);
    const fn = vi.fn();
    when(s, fn);
    s.set(0);
    expect(fn).not.toHaveBeenCalled();
  });

  it("with source that fires immediately on subscription does not crash", () => {
    const s = signal(1); // immediately truthy
    const fn = vi.fn();
    expect(() => when(s, fn)).not.toThrow();
    expect(fn).toHaveBeenCalledWith(1);
  });
});

// ---------- until ----------

describe("until", () => {
  it("resolves immediately when source is already truthy", async () => {
    const s = signal(42);
    const value = await until(s);
    expect(value).toBe(42);
  });

  it("resolves when source becomes truthy", async () => {
    const s = signal<number>(0);
    const promise = until(s);
    s.set(7);
    expect(await promise).toBe(7);
  });

  it("the promise remains pending if source is always falsy (no-timeout behavior)", async () => {
    const s = signal<number>(0);
    let resolved = false;
    until(s).then(() => { resolved = true; });
    // Never set a truthy value
    await new Promise((res) => setTimeout(res, 10));
    expect(resolved).toBe(false);
  });
});

// ---------- debounced ----------

describe("debounced", () => {
  it("returns initial value immediately", () => {
    vi.useFakeTimers();
    const s = signal(1);
    const d = debounced(s, 100);
    expect(d()).toBe(1);
    vi.useRealTimers();
  });

  it("debounces rapid updates", () => {
    vi.useFakeTimers();
    const s = signal(1);
    const d = debounced(s, 100);

    s.set(2);
    s.set(3);
    s.set(4);

    expect(d()).toBe(1); // not yet updated

    vi.advanceTimersByTime(100);
    expect(d()).toBe(4); // settled on last value
    vi.useRealTimers();
  });

  it("emits each value when updates are spaced apart", () => {
    vi.useFakeTimers();
    const s = signal(0);
    const d = debounced(s, 50);

    s.set(1);
    vi.advanceTimersByTime(50);
    expect(d()).toBe(1);

    s.set(2);
    vi.advanceTimersByTime(50);
    expect(d()).toBe(2);
    vi.useRealTimers();
  });

  it("delay=0 fires synchronously after setTimeout(0)", () => {
    vi.useFakeTimers();
    const s = signal("a");
    const d = debounced(s, 0);

    s.set("b");
    expect(d()).toBe("a"); // not yet
    vi.advanceTimersByTime(0);
    expect(d()).toBe("b");
    vi.useRealTimers();
  });

  it("the inner effect is cleaned up when stop is called (no leak)", () => {
    vi.useFakeTimers();
    const s = signal(0);
    const d = debounced(s, 100);

    s.set(1);
    // Stop the debounced effect before the timer fires
    d.stop();

    // Advance time — the timer should not fire and update the signal
    vi.advanceTimersByTime(200);
    expect(d()).toBe(0); // still initial value, effect was stopped

    vi.useRealTimers();
  });
});

// ---------- history ----------

describe("history", () => {
  it("current reflects signal value", () => {
    const s = signal("a");
    const h = history(s);
    expect(h.current()).toBe("a");
  });

  it("canUndo is false initially", () => {
    const s = signal(0);
    const h = history(s);
    expect(h.canUndo()).toBe(false);
  });

  it("canUndo becomes true after a change", () => {
    const s = signal(0);
    const h = history(s);
    s.set(1);
    expect(h.canUndo()).toBe(true);
  });

  it("undo reverts to previous value", () => {
    const s = signal(0);
    const h = history(s);
    s.set(1);
    s.set(2);
    h.undo();
    expect(h.current()).toBe(1);
    expect(s()).toBe(1);
  });

  it("redo re-applies reverted value", () => {
    const s = signal(0);
    const h = history(s);
    s.set(1);
    h.undo();
    expect(h.canRedo()).toBe(true);
    h.redo();
    expect(h.current()).toBe(1);
    expect(s()).toBe(1);
  });

  it("values() returns full timeline", () => {
    const s = signal("a");
    const h = history(s);
    s.set("b");
    s.set("c");
    expect(h.values()).toEqual(["a", "b", "c"]);
  });

  it("clear removes past and future", () => {
    const s = signal(0);
    const h = history(s);
    s.set(1);
    s.set(2);
    h.clear();
    expect(h.canUndo()).toBe(false);
    expect(h.canRedo()).toBe(false);
  });

  it("undo does nothing when there is no history", () => {
    const s = signal(5);
    const h = history(s);
    h.undo();
    expect(h.current()).toBe(5);
  });

  it("redo does nothing when there is no future", () => {
    const s = signal(5);
    const h = history(s);
    s.set(10);
    h.redo();
    expect(h.current()).toBe(10);
  });

  it("works with computed source (read-only — no signal.set)", () => {
    const s = signal(1);
    const c = computed(() => s() * 2);
    const h = history(c);
    s.set(2);
    expect(h.current()).toBe(4);
    expect(h.canUndo()).toBe(true);
  });

  it("respects limit — oldest entries are dropped", () => {
    const s = signal(0);
    const h = history(s, 3);
    for (let i = 1; i <= 5; i++) s.set(i);
    // past holds at most 3, plus current = 4 values total
    expect(h.values().length).toBeLessThanOrEqual(4);
  });

  it("limit=1 allows only one past entry", () => {
    const s = signal(0);
    const h = history(s, 1);
    s.set(1);
    s.set(2);
    s.set(3);
    // values = [past(1 entry max), current] → at most 2 entries
    expect(h.values().length).toBeLessThanOrEqual(2);
    expect(h.current()).toBe(3);
  });

  it("clear() after undo removes both past and future", () => {
    const s = signal(0);
    const h = history(s);
    s.set(1);
    s.set(2);
    h.undo();
    expect(h.canRedo()).toBe(true);
    h.clear();
    expect(h.canUndo()).toBe(false);
    expect(h.canRedo()).toBe(false);
  });

  it("undo() called more times than history entries — state stays consistent", () => {
    const s = signal(0);
    const h = history(s);
    s.set(1);
    h.undo();
    // No more history — undo is a no-op
    h.undo();
    h.undo();
    expect(h.current()).toBe(0);
    expect(h.canUndo()).toBe(false);
  });

  it("values() returns a snapshot — each call after source change yields a fresh array", () => {
    const s = signal("a");
    const h = history(s);
    s.set("b");
    s.set("c");
    const snapshot1 = h.values();
    expect(snapshot1).toEqual(["a", "b", "c"]);
    // Trigger a change so the computed re-evaluates on next read
    s.set("d");
    const snapshot2 = h.values();
    expect(snapshot2).toEqual(["a", "b", "c", "d"]);
    // snapshot1 and snapshot2 are different array instances
    expect(snapshot1).not.toBe(snapshot2);
  });
});
