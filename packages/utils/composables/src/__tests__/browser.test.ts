// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";

import { useMediaQuery, useColorScheme, useMouse, useKeyCombo, useIdle } from "../browser";

// ---------- useMediaQuery ----------

describe("useMediaQuery", () => {
  it("returns computed that reflects matchMedia result", () => {
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn((query: string) => ({
        matches: query === "(prefers-color-scheme: dark)",
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    });

    const isDark = useMediaQuery("(prefers-color-scheme: dark)");
    expect(isDark()).toBe(true);

    const isLight = useMediaQuery("(prefers-color-scheme: light)");
    expect(isLight()).toBe(false);
  });
});

// ---------- useColorScheme ----------

describe("useColorScheme", () => {
  it("isDark and isLight are complementary", () => {
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn(() => ({
        matches: true,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    });

    const { isDark, isLight } = useColorScheme();
    expect(isDark()).toBe(true);
    expect(isLight()).toBe(false);
  });
});

// ---------- useMouse ----------

describe("useMouse", () => {
  it("starts at (0, 0)", () => {
    const { x, y } = useMouse();
    expect(x()).toBe(0);
    expect(y()).toBe(0);
  });

  it("updates on mousemove event", () => {
    const { x, y } = useMouse();
    window.dispatchEvent(
      new MouseEvent("mousemove", { clientX: 100, clientY: 200 }),
    );
    expect(x()).toBe(100);
    expect(y()).toBe(200);
  });
});

// ---------- useKeyCombo ----------

describe("useKeyCombo", () => {
  it("starts as false", () => {
    const pressed = useKeyCombo("ctrl+s");
    expect(pressed()).toBe(false);
  });

  it("becomes true on matching keydown", () => {
    const pressed = useKeyCombo("ctrl+s");
    window.dispatchEvent(
      new KeyboardEvent("keydown", { key: "s", ctrlKey: true }),
    );
    expect(pressed()).toBe(true);
  });

  it("resets to false on keyup", () => {
    const pressed = useKeyCombo("ctrl+s");
    window.dispatchEvent(
      new KeyboardEvent("keydown", { key: "s", ctrlKey: true }),
    );
    window.dispatchEvent(new KeyboardEvent("keyup"));
    expect(pressed()).toBe(false);
  });
});

// ---------- useIdle ----------

describe("useIdle", () => {
  it("starts as not idle", () => {
    vi.useFakeTimers();
    const idle = useIdle(500);
    expect(idle()).toBe(false);
    vi.useRealTimers();
  });

  it("becomes idle after the timeout elapses", () => {
    vi.useFakeTimers();
    const idle = useIdle(500);
    vi.advanceTimersByTime(500);
    expect(idle()).toBe(true);
    vi.useRealTimers();
  });

  it("resets idle on user activity", () => {
    vi.useFakeTimers();
    const idle = useIdle(500);
    vi.advanceTimersByTime(300);
    window.dispatchEvent(new MouseEvent("mousemove"));
    vi.advanceTimersByTime(300); // not enough since activity reset the timer
    expect(idle()).toBe(false);
    vi.useRealTimers();
  });
});
