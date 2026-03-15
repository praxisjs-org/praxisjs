// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from "vitest";

import { persistedSignal } from "../signal/persisted";

beforeEach(() => {
  localStorage.clear();
});

describe("persistedSignal", () => {
  it("returns initialValue when nothing is stored", () => {
    const s = persistedSignal("key1", 42);
    expect(s()).toBe(42);
  });

  it("reads existing value from localStorage", () => {
    localStorage.setItem("key2", "99");
    const s = persistedSignal("key2", 0);
    expect(s()).toBe(99);
  });

  it("persists set() to localStorage", () => {
    const s = persistedSignal("key3", 0);
    s.set(7);
    expect(localStorage.getItem("key3")).toBe("7");
    expect(s()).toBe(7);
  });

  it("persists update() to localStorage", () => {
    const s = persistedSignal("key4", 10);
    s.update((v) => v + 5);
    expect(localStorage.getItem("key4")).toBe("15");
    expect(s()).toBe(15);
  });

  it("removes the key when set to null", () => {
    const s = persistedSignal<string | null>("key5", "hello");
    s.set(null);
    expect(localStorage.getItem("key5")).toBeNull();
  });

  it("marks __isSignal = true", () => {
    const s = persistedSignal("key6", 0);
    expect(s.__isSignal).toBe(true);
  });

  it("supports custom serialize/deserialize", () => {
    const s = persistedSignal("key7", { x: 1 }, {
      serialize: (v) => JSON.stringify(v),
      deserialize: (raw) => JSON.parse(raw) as { x: number },
    });
    s.set({ x: 99 });
    expect(localStorage.getItem("key7")).toBe('{"x":99}');
    const s2 = persistedSignal("key7", { x: 0 }, {
      serialize: JSON.stringify,
      deserialize: (raw) => JSON.parse(raw) as { x: number },
    });
    expect(s2().x).toBe(99);
  });

  it("falls back to initialValue when deserialization fails", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    localStorage.setItem("key8", "{ bad json");
    const s = persistedSignal("key8", 42);
    expect(s()).toBe(42);
    warn.mockRestore();
  });

  it("syncs from storage event on other tab", () => {
    const s = persistedSignal("key9", 1);
    window.dispatchEvent(
      new StorageEvent("storage", {
        key: "key9",
        newValue: "55",
        storageArea: localStorage,
      }),
    );
    expect(s()).toBe(55);
  });

  it("syncTabs=false does not add storage listener", () => {
    const s = persistedSignal("key10", 1, { syncTabs: false });
    s.set(5);
    // Just verify it works without errors
    expect(s()).toBe(5);
  });
});
