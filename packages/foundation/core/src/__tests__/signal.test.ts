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
});
