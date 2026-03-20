import { describe, it, expect } from "vitest";

import { signal } from "../signal/signal";

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
});
