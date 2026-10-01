import { describe, it, expect } from "vitest";

import { batch } from "../signal/batch";
import { SUBS_SET_THRESHOLD } from "../signal/effect";
import { effect } from "../signal/effect";
import { signal, addSub, removeSub, type SubList } from "../signal/signal";
import type { Effect } from "../signal/effect";

describe("signal", () => {
  it("returns initial value", () => {
    const s = signal(42);
    expect(s()).toBe(42);
  });

  it("updates value with set", () => {
    const s = signal(0);
    s.set(10);
    expect(s()).toBe(10);
  });

  it("updates value with update fn", () => {
    const s = signal(5);
    s.update((v) => v * 2);
    expect(s()).toBe(10);
  });

  it("skips update when value is identical", () => {
    const s = signal(1);
    const calls: number[] = [];
    s.subscribe((v) => calls.push(v));
    const before = calls.length;
    s.set(1); // same value
    expect(calls.length).toBe(before);
  });

  it("subscribe fires immediately with current value", () => {
    const s = signal("hello");
    const received: string[] = [];
    s.subscribe((v) => received.push(v));
    expect(received).toEqual(["hello"]);
  });

  it("subscribe fires on subsequent updates", () => {
    const s = signal(0);
    const received: number[] = [];
    s.subscribe((v) => received.push(v));
    s.set(1);
    s.set(2);
    expect(received).toEqual([0, 1, 2]);
  });

  it("unsubscribe stops receiving updates", () => {
    const s = signal(0);
    const received: number[] = [];
    const unsub = s.subscribe((v) => received.push(v));
    unsub();
    s.set(99);
    expect(received).toEqual([0]);
  });

  it("marks __isSignal = true", () => {
    const s = signal(0);
    expect(s.__isSignal).toBe(true);
  });

  it("supports object values", () => {
    const s = signal<{ name: string }>({ name: "Alice" });
    s.set({ name: "Bob" });
    expect(s().name).toBe("Bob");
  });

  it("supports null and undefined", () => {
    const s = signal<null | number>(null);
    expect(s()).toBeNull();
    s.set(5);
    expect(s()).toBe(5);
  });

  it("NaN is considered equal to NaN — no notification", () => {
    const s = signal(NaN);
    const calls: unknown[] = [];
    s.subscribe((v) => calls.push(v));
    const before = calls.length;
    s.set(NaN);
    expect(calls.length).toBe(before);
  });

  it("-0 and +0 are considered different — notification fires", () => {
    const s = signal<number>(-0);
    const calls: number[] = [];
    s.subscribe((v) => calls.push(v));
    const before = calls.length;
    s.set(+0);
    expect(calls.length).toBe(before + 1);
  });

  it("update() fn that throws does not update the value", () => {
    const s = signal(5);
    expect(() => s.update(() => { throw new Error("fn error"); })).toThrow("fn error");
    expect(s()).toBe(5);
  });

  it("multiple subscribers all receive the update", () => {
    const s = signal(0);
    const a: number[] = [];
    const b: number[] = [];
    s.subscribe((v) => a.push(v));
    s.subscribe((v) => b.push(v));
    s.set(7);
    expect(a).toContain(7);
    expect(b).toContain(7);
  });

  it("subscriber B still fires when subscriber A throws", () => {
    const s = signal(0);
    const received: number[] = [];
    s.subscribe((v) => { if (v !== 0) throw new Error("sub A throws"); });
    s.subscribe((v) => received.push(v));
    expect(() => s.set(1)).toThrow("sub A throws");
    expect(received).toContain(1);
  });

  it("unsubscribe during notification does not crash", () => {
    const s = signal(0);
    let unsub: (() => void) | undefined;
    unsub = s.subscribe(() => {
      unsub?.();
    });
    expect(() => s.set(1)).not.toThrow();
  });

  it("unsubscribing one of multiple subscribers removes only that subscriber", () => {
    const s = signal(0);
    const a: number[] = [];
    const b: number[] = [];
    const unsubA = s.subscribe((v) => a.push(v));
    s.subscribe((v) => b.push(v));
    // subs is now an array — hits removeSub else branch
    unsubA();
    s.set(1);
    expect(a).toEqual([0]); // A stopped after initial fire
    expect(b).toEqual([0, 1]); // B still receives
  });

  it("unsubscribing a non-existent subscriber from array subs is a no-op", () => {
    const s = signal(0);
    const a: number[] = [];
    const b: number[] = [];
    s.subscribe((v) => a.push(v));
    const unsubB = s.subscribe((v) => b.push(v));
    unsubB(); // remove B, subs becomes array without B
    unsubB(); // call again — idx will be -1, splice not called
    expect(() => s.set(1)).not.toThrow();
    expect(a).toContain(1);
  });

  it("batch defers notifications for multiple array subscribers", () => {
    const s = signal(0);
    const a: number[] = [];
    const b: number[] = [];
    s.subscribe((v) => a.push(v));
    s.subscribe((v) => b.push(v));
    // subs is an array; inside batch, notifySubs hits the batching=true array path
    batch(() => {
      s.set(1);
      expect(a).toEqual([0]); // not yet fired
      expect(b).toEqual([0]);
    });
    expect(a).toContain(1);
    expect(b).toContain(1);
  });

  it("removeSub with non-matching single-function subscriber is a no-op", () => {
    // When subs is a single function and we try to remove a different function,
    // the holder must remain unchanged (subs !== eff → false branch).
    const holder: { subs: SubList } = { subs: null };
    const fn1: Effect = () => {};
    const fn2: Effect = () => {};
    addSub(holder, fn1); // subs = fn1 (single function)
    removeSub(holder, fn2); // fn2 !== fn1 → no-op
    expect(holder.subs).toBe(fn1);
  });

  it("addSub does not add a duplicate subscriber to an array holder", () => {
    const fn1: Effect = () => {};
    const fn2: Effect = () => {};
    const holder: { subs: SubList } = { subs: [fn1, fn2] };

    addSub(holder, fn2);

    expect(holder.subs).toEqual([fn1, fn2]);
  });

  it("removeSub normalizes an emptied array holder back to null", () => {
    const fn: Effect = () => {};
    const holder: { subs: SubList } = { subs: [fn] };

    removeSub(holder, fn);

    expect(holder.subs).toBeNull();
  });

  it("set() with mutated object reference (same ref) does NOT notify — Object.is semantics", () => {
    const obj = { count: 0 };
    const s = signal(obj);
    const calls: unknown[] = [];
    s.subscribe((v) => calls.push(v));
    const before = calls.length;
    // Mutate the object in-place and set the same reference
    obj.count = 99;
    s.set(obj);
    // Object.is(obj, obj) === true, so no notification
    expect(calls.length).toBe(before);
  });
});

describe("large subscriber lists", () => {
  function fns(count: number): Array<() => void> {
    return Array.from({ length: count }, () => () => {});
  }

  it("keeps an array up to the threshold and promotes to a Set past it, preserving order", () => {
    const holder: { subs: SubList } = { subs: null };
    const list = fns(SUBS_SET_THRESHOLD);
    for (const fn of list) addSub(holder, fn);
    expect(Array.isArray(holder.subs)).toBe(true);

    const extra = () => {};
    addSub(holder, extra);
    expect(holder.subs).toBeInstanceOf(Set);
    expect([...(holder.subs as Set<() => void>)]).toEqual([...list, extra]);
  });

  it("addSub on a Set holder adds new subscribers and ignores duplicates", () => {
    const list = fns(SUBS_SET_THRESHOLD + 1);
    const holder: { subs: SubList } = { subs: new Set(list) };
    addSub(holder, list[0]);
    expect((holder.subs as Set<() => void>).size).toBe(list.length);
    const extra = () => {};
    addSub(holder, extra);
    expect((holder.subs as Set<() => void>).size).toBe(list.length + 1);
  });

  it("removeSub on a Set holder removes one subscriber, ignores unknown ones, and normalizes to null when emptied", () => {
    const [a, b, stranger] = fns(3);
    const holder: { subs: SubList } = { subs: new Set([a, b]) };
    removeSub(holder, stranger);
    expect((holder.subs as Set<() => void>).size).toBe(2);
    removeSub(holder, a);
    expect([...(holder.subs as Set<() => void>)]).toEqual([b]);
    removeSub(holder, b);
    expect(holder.subs).toBeNull();
  });

  it("many effects on one signal all re-run once per change, in subscription order", () => {
    const count = SUBS_SET_THRESHOLD * 3;
    const s = signal(0);
    const order: number[] = [];
    const stops = Array.from({ length: count }, (_, i) =>
      effect(() => {
        void s();
        order.push(i);
      }),
    );
    order.length = 0;
    s.set(1);
    expect(order).toEqual(Array.from({ length: count }, (_, i) => i));
    order.length = 0;
    s.set(2);
    expect(order).toEqual(Array.from({ length: count }, (_, i) => i));
    stops.forEach((stop) => { stop(); });
    order.length = 0;
    s.set(3);
    expect(order).toEqual([]);
  });

  it("an effect stopped while the signal holds a Set no longer runs, the others still do", () => {
    const s = signal(0);
    const runs = new Map<number, number>();
    const stops = Array.from({ length: SUBS_SET_THRESHOLD + 4 }, (_, i) =>
      effect(() => {
        void s();
        runs.set(i, (runs.get(i) ?? 0) + 1);
      }),
    );
    stops[2]();
    s.set(1);
    expect(runs.get(2)).toBe(1);
    expect(runs.get(3)).toBe(2);
  });
});
