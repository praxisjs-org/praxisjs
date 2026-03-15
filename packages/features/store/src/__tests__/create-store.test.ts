import { describe, it, expect } from "vitest";

import { createStore } from "../create-store";

function makeCounter() {
  return createStore({
    count: 0,
    step: 1,
    increment() {
      (this as unknown as { count: number; step: number }).count +=
        (this as unknown as { count: number; step: number }).step;
    },
    decrement() {
      (this as unknown as { count: number }).count--;
    },
  })();
}

describe("createStore", () => {
  it("returns a factory that provides the store proxy", () => {
    const store = makeCounter();
    expect(store).toBeDefined();
  });

  it("reads signal state via property access", () => {
    const store = makeCounter();
    expect(store.count).toBe(0);
  });

  it("sets signal state via property assignment", () => {
    const store = makeCounter();
    (store as unknown as { count: number }).count = 5;
    expect(store.count).toBe(5);
  });

  it("calls methods bound to the store proxy", () => {
    const store = makeCounter();
    (store as unknown as { increment: () => void }).increment();
    expect(store.count).toBe(1);
  });

  it("$state returns a plain snapshot of all state", () => {
    const store = makeCounter();
    const state = (store as unknown as { $state: () => Record<string, unknown> }).$state();
    expect(state).toEqual({ count: 0, step: 1 });
  });

  it("$patch updates multiple keys at once", () => {
    const store = makeCounter();
    (store as unknown as { $patch: (p: Record<string, unknown>) => void }).$patch({ count: 10, step: 5 });
    expect(store.count).toBe(10);
    expect(store.step).toBe(5);
  });

  it("$reset restores initial values", () => {
    const store = makeCounter();
    (store as unknown as { count: number }).count = 99;
    (store as unknown as { $reset: () => void }).$reset();
    expect(store.count).toBe(0);
  });

  it("$subscribe calls listener with state snapshot on each change", () => {
    const store = makeCounter();
    const snapshots: number[] = [];
    (store as unknown as { $subscribe: (fn: (s: Record<string, unknown>) => void) => () => void }).$subscribe(
      (s) => snapshots.push(s.count as number),
    );
    (store as unknown as { count: number }).count = 42;
    (store as unknown as { count: number }).count = 99;
    expect(snapshots).toEqual([0, 42, 99]);
  });

  it("definition getters are exposed on the store proxy", () => {
    const definition = {
      a: 2,
      b: 3,
      get sum() { return (this as unknown as { a: number; b: number }).a + (this as unknown as { a: number; b: number }).b; },
    };
    const store = createStore(definition)();
    expect((store as unknown as { sum: number }).sum).toBe(5);
  });

  it("setting a non-signal key via proxy returns false silently", () => {
    const store = makeCounter();
    // symbol keys are skipped — should not throw
    expect(() => {
      (store as unknown as Record<symbol, unknown>)[Symbol("noop")] = 1;
    }).not.toThrow();
  });

  it("$patch ignores unknown keys", () => {
    const store = makeCounter();
    expect(() =>
      { (store as unknown as { $patch: (p: Record<string, unknown>) => void }).$patch({ unknownKey: 123 }); },
    ).not.toThrow();
    expect(store.count).toBe(0);
  });
});
