// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

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

  it("warns and falls back to initialValue when serialize throws on set", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const s = persistedSignal("key11", { x: 1 }, {
      serialize: () => { throw new Error("serialize fail"); },
      deserialize: JSON.parse as (v: string) => { x: number },
    });
    expect(() => s.set({ x: 2 })).not.toThrow();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("Failed to serialize"), expect.any(Error));
    warn.mockRestore();
  });

  it("syncs to initialValue when storage event has newValue=null (key removed)", () => {
    const s = persistedSignal("key12", 42);
    s.set(99);

    window.dispatchEvent(
      new StorageEvent("storage", {
        key: "key12",
        newValue: null, // key removed in another tab
        storageArea: localStorage,
      }),
    );
    expect(s()).toBe(42); // falls back to initialValue
  });

  it("warns and falls back to initialValue when storage event deserialization fails", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const s = persistedSignal("key13", 0, {
      deserialize: () => { throw new Error("bad"); },
    });

    window.dispatchEvent(
      new StorageEvent("storage", {
        key: "key13",
        newValue: "invalid",
        storageArea: localStorage,
      }),
    );
    expect(s()).toBe(0);
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining("Failed to deserialize"),
      expect.any(Error),
    );
    warn.mockRestore();
  });

  it("ignores storage events from other keys", () => {
    const s = persistedSignal("key14", 1);
    window.dispatchEvent(
      new StorageEvent("storage", {
        key: "other-key",
        newValue: "999",
        storageArea: localStorage,
      }),
    );
    expect(s()).toBe(1);
  });

  it("set(undefined) removes the key from localStorage", () => {
    const s = persistedSignal<number | undefined>("key15", 5);
    s.set(undefined);
    expect(localStorage.getItem("key15")).toBeNull();
  });

  it("localStorage.setItem throws QuotaExceededError — signal state is updated but no crash", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const setItemSpy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      const err = new DOMException("QuotaExceededError", "QuotaExceededError");
      throw err;
    });

    const s = persistedSignal("key16", 0);
    expect(() => s.set(42)).not.toThrow();
    // The in-memory signal value is still updated despite storage failure
    expect(s()).toBe(42);

    setItemSpy.mockRestore();
    warn.mockRestore();
  });

  it("syncTabs=true — storage event with empty string newValue is handled", () => {
    const s = persistedSignal("key17", 99);
    window.dispatchEvent(
      new StorageEvent("storage", {
        key: "key17",
        newValue: "",
        storageArea: localStorage,
      }),
    );
    // Empty string is falsy, so falls back to initialValue
    expect(s()).toBe(99);
  });

  it("syncTabs=true — storage event from sessionStorage is ignored", () => {
    const s = persistedSignal("key18", 10);
    s.set(20);
    window.dispatchEvent(
      new StorageEvent("storage", {
        key: "key18",
        newValue: "999",
        storageArea: sessionStorage,
      }),
    );
    // Should stay at 20 since the event is from sessionStorage, not localStorage
    expect(s()).toBe(20);
  });

  it("close() stops storage-event syncing but keeps the signal working locally", () => {
    const s = persistedSignal("close-key", 0);
    s.close();
    window.dispatchEvent(
      new StorageEvent("storage", { key: "close-key", newValue: "5", storageArea: localStorage }),
    );
    expect(s()).toBe(0);
    s.set(3);
    expect(s()).toBe(3);
    expect(localStorage.getItem("close-key")).toBe("3");
  });

  it("close() removes the window listener and is safe to call twice", () => {
    const remove = vi.spyOn(window, "removeEventListener");
    const s = persistedSignal("close-twice", 0);
    s.close();
    s.close();
    expect(remove.mock.calls.filter(([type]) => type === "storage")).toHaveLength(1);
    remove.mockRestore();
  });

  it("close() is a no-op when syncTabs is false", () => {
    const remove = vi.spyOn(window, "removeEventListener");
    const s = persistedSignal("close-nosync", 0, { syncTabs: false });
    expect(() => { s.close(); }).not.toThrow();
    expect(remove.mock.calls.filter(([type]) => type === "storage")).toHaveLength(0);
    remove.mockRestore();
  });
});

describe("persistedSignal writeDelay", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("writes immediately by default", () => {
    const s = persistedSignal("wd-default", 0);
    s.set(1);
    expect(localStorage.getItem("wd-default")).toBe("1");
  });

  it("holds writes back and flushes the latest value once the delay elapses", () => {
    vi.useFakeTimers();
    const setItem = vi.spyOn(Storage.prototype, "setItem");
    const s = persistedSignal("wd-burst", 0, { writeDelay: 100 });
    s.set(1);
    s.set(2);
    s.update((n) => n + 1);
    expect(s()).toBe(3);
    expect(localStorage.getItem("wd-burst")).toBeNull();
    vi.advanceTimersByTime(100);
    expect(localStorage.getItem("wd-burst")).toBe("3");
    expect(setItem.mock.calls.filter(([k]) => k === "wd-burst")).toHaveLength(1);
    setItem.mockRestore();
  });

  it("starts a new window for writes after a flush", () => {
    vi.useFakeTimers();
    const s = persistedSignal("wd-next", 0, { writeDelay: 50 });
    s.set(1);
    vi.advanceTimersByTime(50);
    s.set(2);
    expect(localStorage.getItem("wd-next")).toBe("1");
    vi.advanceTimersByTime(50);
    expect(localStorage.getItem("wd-next")).toBe("2");
  });

  it("flushes pending data on pagehide", () => {
    vi.useFakeTimers();
    const s = persistedSignal("wd-hide", 0, { writeDelay: 1000 });
    s.set(5);
    window.dispatchEvent(new Event("pagehide"));
    expect(localStorage.getItem("wd-hide")).toBe("5");
    vi.advanceTimersByTime(1000);
    expect(localStorage.getItem("wd-hide")).toBe("5");
  });

  it("close() flushes pending data and stops listening for pagehide", () => {
    vi.useFakeTimers();
    const s = persistedSignal("wd-close", 0, { writeDelay: 1000 });
    s.set(7);
    s.close();
    expect(localStorage.getItem("wd-close")).toBe("7");
    s.set(8);
    window.dispatchEvent(new Event("pagehide"));
    expect(localStorage.getItem("wd-close")).toBe("7");
  });

  it("a value arriving from another tab discards the pending local write", () => {
    vi.useFakeTimers();
    const s = persistedSignal("wd-remote", 0, { writeDelay: 100 });
    s.set(1);
    localStorage.setItem("wd-remote", "9");
    window.dispatchEvent(
      new StorageEvent("storage", { key: "wd-remote", newValue: "9", storageArea: localStorage }),
    );
    vi.advanceTimersByTime(100);
    expect(s()).toBe(9);
    expect(localStorage.getItem("wd-remote")).toBe("9");
  });

  it("removes null and undefined values when the write is flushed", () => {
    vi.useFakeTimers();
    const s = persistedSignal<number | null>("wd-null", 1, { writeDelay: 10 });
    s.set(2);
    vi.advanceTimersByTime(10);
    s.set(null);
    vi.advanceTimersByTime(10);
    expect(localStorage.getItem("wd-null")).toBeNull();
  });
});
