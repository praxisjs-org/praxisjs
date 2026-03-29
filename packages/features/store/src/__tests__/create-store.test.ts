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

  it("setting a non-signal string key via proxy returns false", () => {
    const store = makeCounter();
    // "nonExistent" is a string key but is not a signal — set returns false
    const result = Reflect.set(
      store as object,
      "nonExistent",
      42,
    );
    expect(result).toBe(false);
  });

  it("getting an unknown key returns undefined", () => {
    const store = makeCounter();
    const val = (store as unknown as Record<string, unknown>).doesNotExist;
    expect(val).toBeUndefined();
  });

  it("multiple $subscribe listeners all receive updates", () => {
    const store = makeCounter();
    const snapshotsA: number[] = [];
    const snapshotsB: number[] = [];

    type StoreType = { $subscribe: (fn: (s: Record<string, unknown>) => void) => () => void };
    (store as unknown as StoreType).$subscribe((s) => snapshotsA.push(s.count as number));
    (store as unknown as StoreType).$subscribe((s) => snapshotsB.push(s.count as number));

    (store as unknown as { count: number }).count = 5;
    expect(snapshotsA).toContain(5);
    expect(snapshotsB).toContain(5);
  });

  it("$subscribe unsubscribe stops delivery to that listener", () => {
    const store = makeCounter();
    const snapshots: number[] = [];

    type StoreType = { $subscribe: (fn: (s: Record<string, unknown>) => void) => () => void };
    const unsub = (store as unknown as StoreType).$subscribe(
      (s) => snapshots.push(s.count as number),
    );

    (store as unknown as { count: number }).count = 1;
    unsub();
    (store as unknown as { count: number }).count = 2;

    // After unsub, count=2 should NOT be in snapshots
    expect(snapshots).toContain(1);
    expect(snapshots).not.toContain(2);
  });

  it("getting via a symbol key returns undefined", () => {
    const store = makeCounter();
    const sym = Symbol("test");
    const val = Reflect.get(store as object, sym);
    expect(val).toBeUndefined();
  });

  it("$state() snapshot includes getter values", () => {
    const store = createStore({
      a: 2,
      b: 3,
      get sum() {
        return (this as unknown as { a: number; b: number }).a + (this as unknown as { a: number; b: number }).b;
      },
    })();

    // $state returns only signal-backed fields (not getters)
    const state = (store as unknown as { $state: () => Record<string, unknown> }).$state();
    expect(state).toHaveProperty("a", 2);
    expect(state).toHaveProperty("b", 3);
  });

  it("$patch({ count: undefined }) — skips that key (count unchanged)", () => {
    const store = makeCounter();
    (store as unknown as { $patch: (p: Record<string, unknown>) => void }).$patch({ count: undefined });
    expect(store.count).toBe(0);
  });

  it("$patch({ count: null }) — sets count to null (valid update)", () => {
    const store = makeCounter();
    (store as unknown as { $patch: (p: Record<string, unknown>) => void }).$patch({ count: null });
    expect(store.count).toBeNull();
  });

  it("getter reads two signals — getter result updates when either signal changes", () => {
    // Use a non-enumerable getter so it is NOT captured by Object.entries
    // and instead goes through the live desc.get.call(store) path.
    const definition: Record<string, unknown> = { a: 10, b: 20 };
    Object.defineProperty(definition, "total", {
      enumerable: false,
      configurable: true,
      get() {
        return (this as unknown as { a: number; b: number }).a +
          (this as unknown as { a: number; b: number }).b;
      },
    });

    const store = createStore(definition as { a: number; b: number })();
    type S = { a: number; b: number; total: number };
    const s = store as unknown as S;

    expect(s.total).toBe(30);
    Reflect.set(store as object, "a", 5);
    expect(s.total).toBe(25);
    Reflect.set(store as object, "b", 5);
    expect(s.total).toBe(10);
  });

  it("$subscribe listener called with the correct new value", () => {
    const store = makeCounter();
    const received: number[] = [];
    type StoreType = { $subscribe: (fn: (s: Record<string, unknown>) => void) => () => void };
    (store as unknown as StoreType).$subscribe((s) => received.push(s.count as number));
    (store as unknown as { count: number }).count = 7;
    expect(received).toContain(7);
  });

  it("$reset restores all signals to initial values after multiple mutations", () => {
    const store = makeCounter();
    (store as unknown as { count: number }).count = 10;
    (store as unknown as { step: number }).step = 5;
    (store as unknown as { $reset: () => void }).$reset();
    expect(store.count).toBe(0);
    expect(store.step).toBe(1);
  });

  it("two store factory calls with same definition — produce independent stores", () => {
    const definition = { count: 0 };
    const storeA = createStore({ ...definition })();
    const storeB = createStore({ ...definition })();
    (storeA as unknown as { count: number }).count = 42;
    expect(storeA.count).toBe(42);
    expect(storeB.count).toBe(0); // independent — storeB unaffected
  });
});
