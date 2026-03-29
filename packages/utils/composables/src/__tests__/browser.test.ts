// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";

import { MediaQuery, ColorScheme, Mouse, KeyCombo, Idle } from "../browser";

function mockMatchMedia(matches: boolean, onAdd?: (_: string, fn: (e: MediaQueryListEvent) => void) => void) {
  const mql = {
    matches,
    addEventListener: onAdd ?? vi.fn(),
    removeEventListener: vi.fn(),
  } as unknown as MediaQueryList;
  vi.stubGlobal("matchMedia", () => mql);
  return mql;
}

// ── MediaQuery ────────────────────────────────────────────────────────────────

describe("MediaQuery", () => {
  beforeEach(() => { vi.restoreAllMocks(); });

  it("reads initial match state", () => {
    mockMatchMedia(true);
    const mq = new MediaQuery("(min-width: 768px)");
    const { matches } = mq.setup() as { matches: () => boolean };
    expect(matches()).toBe(true);
  });

  it("updates matches when change event fires", () => {
    let changeHandler: ((e: MediaQueryListEvent) => void) | undefined;
    mockMatchMedia(false, (_: string, fn) => { changeHandler = fn; });

    const mq = new MediaQuery("(min-width: 768px)");
    const { matches } = mq.setup() as { matches: () => boolean };
    expect(matches()).toBe(false);

    changeHandler!({ matches: true } as MediaQueryListEvent);
    expect(matches()).toBe(true);
  });

  it("removes event listener on unmount", () => {
    const mql = mockMatchMedia(false);
    const mq = new MediaQuery("(min-width: 768px)");
    mq.setup();
    mq.onUnmount();
    expect((mql.removeEventListener as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith("change", expect.any(Function));
  });

  it("onUnmount is safe to call without setup (covers false branch)", () => {
    const mq = new MediaQuery("(min-width: 768px)");
    expect(() => mq.onUnmount()).not.toThrow();
  });
});

// ── ColorScheme ───────────────────────────────────────────────────────────────

describe("ColorScheme", () => {
  beforeEach(() => { vi.restoreAllMocks(); });

  it("exposes isDark and isLight as computed inverses", () => {
    let changeHandler: ((e: MediaQueryListEvent) => void) | undefined;
    mockMatchMedia(false, (_: string, fn) => { changeHandler = fn; });

    const cs = new ColorScheme();
    const { isDark, isLight } = cs.setup() as { isDark: () => boolean; isLight: () => boolean };

    expect(isDark()).toBe(false);
    expect(isLight()).toBe(true);

    changeHandler!({ matches: true } as MediaQueryListEvent);
    expect(isDark()).toBe(true);
    expect(isLight()).toBe(false);
  });

  it("removes event listener on unmount", () => {
    const mql = mockMatchMedia(false);
    const cs = new ColorScheme();
    cs.setup();
    cs.onUnmount();
    expect((mql.removeEventListener as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith("change", expect.any(Function));
  });

  it("onUnmount is safe to call without setup (covers false branch)", () => {
    const cs = new ColorScheme();
    expect(() => cs.onUnmount()).not.toThrow();
  });
});

// ── Mouse ─────────────────────────────────────────────────────────────────────

describe("Mouse", () => {
  it("starts at (0, 0)", () => {
    const mouse = new Mouse();
    const { x, y } = mouse.setup() as { x: () => number; y: () => number };
    expect(x()).toBe(0);
    expect(y()).toBe(0);
  });

  it("updates x and y on mousemove", () => {
    const mouse = new Mouse();
    const { x, y } = mouse.setup() as { x: () => number; y: () => number };

    window.dispatchEvent(new MouseEvent("mousemove", { clientX: 120, clientY: 80 }));
    expect(x()).toBe(120);
    expect(y()).toBe(80);
  });

  it("removes listener on unmount", () => {
    const remove = vi.spyOn(window, "removeEventListener");
    const mouse = new Mouse();
    mouse.setup();
    mouse.onUnmount();
    expect(remove).toHaveBeenCalledWith("mousemove", expect.any(Function));
  });
});

// ── KeyCombo ──────────────────────────────────────────────────────────────────

describe("KeyCombo", () => {
  it("starts as not pressed", () => {
    const kc = new KeyCombo("ctrl+s");
    const { pressed } = kc.setup() as { pressed: () => boolean };
    expect(pressed()).toBe(false);
  });

  it("sets pressed=true when matching combo is pressed", () => {
    const kc = new KeyCombo("ctrl+s");
    const { pressed } = kc.setup() as { pressed: () => boolean };

    window.dispatchEvent(new KeyboardEvent("keydown", { ctrlKey: true, key: "s" }));
    expect(pressed()).toBe(true);
  });

  it("resets pressed on keyup", () => {
    const kc = new KeyCombo("ctrl+s");
    const { pressed } = kc.setup() as { pressed: () => boolean };

    window.dispatchEvent(new KeyboardEvent("keydown", { ctrlKey: true, key: "s" }));
    window.dispatchEvent(new KeyboardEvent("keyup"));
    expect(pressed()).toBe(false);
  });

  it("does not set pressed for wrong key", () => {
    const kc = new KeyCombo("ctrl+s");
    const { pressed } = kc.setup() as { pressed: () => boolean };

    window.dispatchEvent(new KeyboardEvent("keydown", { ctrlKey: true, key: "z" }));
    expect(pressed()).toBe(false);
  });

  it("removes listeners on unmount", () => {
    const remove = vi.spyOn(window, "removeEventListener");
    const kc = new KeyCombo("ctrl+s");
    kc.setup();
    kc.onUnmount();
    expect(remove).toHaveBeenCalledWith("keydown", expect.any(Function));
    expect(remove).toHaveBeenCalledWith("keyup", expect.any(Function));
  });

  it("matches combo without ctrl modifier (ctrl branch: `: true`)", () => {
    const kc = new KeyCombo("s");
    const { pressed } = kc.setup() as { pressed: () => boolean };
    // No ctrlKey needed — parts doesn't include "ctrl" so ctrl = true always
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "s" }));
    expect(pressed()).toBe(true);
  });

  it("matches combo with shift modifier (shift branch: `e.shiftKey`)", () => {
    const kc = new KeyCombo("ctrl+shift+s");
    const { pressed } = kc.setup() as { pressed: () => boolean };
    window.dispatchEvent(new KeyboardEvent("keydown", { ctrlKey: true, shiftKey: true, key: "s" }));
    expect(pressed()).toBe(true);
  });

  it("does not match when shift is required but not pressed", () => {
    const kc = new KeyCombo("ctrl+shift+s");
    const { pressed } = kc.setup() as { pressed: () => boolean };
    window.dispatchEvent(new KeyboardEvent("keydown", { ctrlKey: true, shiftKey: false, key: "s" }));
    expect(pressed()).toBe(false);
  });

  it("matches combo with alt modifier (alt branch: `e.altKey`)", () => {
    const kc = new KeyCombo("ctrl+alt+s");
    const { pressed } = kc.setup() as { pressed: () => boolean };
    window.dispatchEvent(new KeyboardEvent("keydown", { ctrlKey: true, altKey: true, key: "s" }));
    expect(pressed()).toBe(true);
  });
});

// ── Idle ──────────────────────────────────────────────────────────────────────

describe("Idle", () => {
  it("starts as not idle", () => {
    vi.useFakeTimers();
    const idle = new Idle(500);
    const { idle: isIdle } = idle.setup() as { idle: () => boolean };
    expect(isIdle()).toBe(false);
    vi.useRealTimers();
  });

  it("becomes idle after timeout", () => {
    vi.useFakeTimers();
    const composable = new Idle(500);
    const { idle: isIdle } = composable.setup() as { idle: () => boolean };
    vi.advanceTimersByTime(500);
    expect(isIdle()).toBe(true);
    vi.useRealTimers();
  });

  it("resets idle timer on activity", () => {
    vi.useFakeTimers();
    const composable = new Idle(500);
    const { idle: isIdle } = composable.setup() as { idle: () => boolean };
    vi.advanceTimersByTime(400);
    window.dispatchEvent(new MouseEvent("mousemove"));
    vi.advanceTimersByTime(400);
    expect(isIdle()).toBe(false);
    vi.useRealTimers();
  });

  it("removes listeners on unmount", () => {
    const remove = vi.spyOn(window, "removeEventListener");
    const composable = new Idle(500);
    composable.setup();
    composable.onUnmount();
    expect(remove).toHaveBeenCalled();
  });

  it("fires on scroll event", () => {
    vi.useFakeTimers();
    const composable = new Idle(500);
    const { idle: isIdle } = composable.setup() as { idle: () => boolean };
    vi.advanceTimersByTime(500);
    expect(isIdle()).toBe(true);
    window.dispatchEvent(new Event("scroll"));
    expect(isIdle()).toBe(false);
    vi.useRealTimers();
  });

  it("fires on click event", () => {
    vi.useFakeTimers();
    const composable = new Idle(500);
    const { idle: isIdle } = composable.setup() as { idle: () => boolean };
    vi.advanceTimersByTime(500);
    expect(isIdle()).toBe(true);
    window.dispatchEvent(new MouseEvent("click"));
    expect(isIdle()).toBe(false);
    vi.useRealTimers();
  });

  it("fires on keydown event", () => {
    vi.useFakeTimers();
    const composable = new Idle(500);
    const { idle: isIdle } = composable.setup() as { idle: () => boolean };
    vi.advanceTimersByTime(500);
    expect(isIdle()).toBe(true);
    window.dispatchEvent(new KeyboardEvent("keydown"));
    expect(isIdle()).toBe(false);
    vi.useRealTimers();
  });

  it("activity after becoming idle resets the timer", () => {
    vi.useFakeTimers();
    const composable = new Idle(500);
    const { idle: isIdle } = composable.setup() as { idle: () => boolean };
    vi.advanceTimersByTime(500);
    expect(isIdle()).toBe(true);
    window.dispatchEvent(new MouseEvent("mousemove"));
    expect(isIdle()).toBe(false);
    // Should become idle again after full timeout elapses
    vi.advanceTimersByTime(500);
    expect(isIdle()).toBe(true);
    vi.useRealTimers();
  });
});

// ── KeyCombo (additional) ─────────────────────────────────────────────────────

describe("KeyCombo (additional)", () => {
  it("fires on meta+s keydown", () => {
    const kc = new KeyCombo("meta+s");
    const { pressed } = kc.setup() as { pressed: () => boolean };
    window.dispatchEvent(new KeyboardEvent("keydown", { metaKey: true, key: "s" }));
    expect(pressed()).toBe(true);
  });

  it("modifier-only combo (ctrl+shift) never fires", () => {
    const kc = new KeyCombo("ctrl+shift");
    const { pressed } = kc.setup() as { pressed: () => boolean };
    window.dispatchEvent(new KeyboardEvent("keydown", { ctrlKey: true, shiftKey: true, key: "Control" }));
    window.dispatchEvent(new KeyboardEvent("keydown", { ctrlKey: true, shiftKey: true, key: "Shift" }));
    window.dispatchEvent(new KeyboardEvent("keydown", { ctrlKey: true, shiftKey: true, key: "a" }));
    expect(pressed()).toBe(false);
  });

  it("whitespace in combo string (ctrl + s) is handled gracefully — fires on ctrl+s", () => {
    // Parts are trimmed, so "ctrl + s" becomes ["ctrl", "s"] after trim
    const kc = new KeyCombo("ctrl + s");
    const { pressed } = kc.setup() as { pressed: () => boolean };
    window.dispatchEvent(new KeyboardEvent("keydown", { ctrlKey: true, key: "s" }));
    expect(pressed()).toBe(true);
  });

  it("setup() called twice registers only one set of listeners", () => {
    const add = vi.spyOn(window, "addEventListener");
    const kc = new KeyCombo("ctrl+s");
    kc.setup();
    kc.setup();
    const keydownCalls = add.mock.calls.filter((c) => c[0] === "keydown").length;
    expect(keydownCalls).toBe(1);
  });
});

// ── MediaQuery (additional) ───────────────────────────────────────────────────

describe("MediaQuery (additional)", () => {
  beforeEach(() => { vi.restoreAllMocks(); });

  it("setup() called twice registers only one listener", () => {
    const mql = mockMatchMedia(false);
    const mq = new MediaQuery("(min-width: 768px)");
    mq.setup();
    mq.setup();
    expect((mql.addEventListener as ReturnType<typeof vi.fn>)).toHaveBeenCalledTimes(1);
  });
});

// ── ColorScheme (additional) ──────────────────────────────────────────────────

describe("ColorScheme (additional)", () => {
  beforeEach(() => { vi.restoreAllMocks(); });

  it("setup() called twice registers only one listener", () => {
    const mql = mockMatchMedia(false);
    const cs = new ColorScheme();
    cs.setup();
    cs.setup();
    expect((mql.addEventListener as ReturnType<typeof vi.fn>)).toHaveBeenCalledTimes(1);
  });
});

// ── Mouse (additional) ────────────────────────────────────────────────────────

describe("Mouse (additional)", () => {
  it("setup() called twice returns the same view object", () => {
    const mouse = new Mouse();
    const view1 = mouse.setup();
    const view2 = mouse.setup();
    expect(view1).toBe(view2);
  });

  it("setup() called twice registers only one mousemove listener", () => {
    const add = vi.spyOn(window, "addEventListener");
    const mouse = new Mouse();
    mouse.setup();
    mouse.setup();
    const moveCalls = add.mock.calls.filter((c) => c[0] === "mousemove").length;
    expect(moveCalls).toBe(1);
    vi.restoreAllMocks();
  });
});

// ── Idle (additional) ─────────────────────────────────────────────────────────

describe("Idle (additional)", () => {
  it("setup() called twice returns the same view object", () => {
    vi.useFakeTimers();
    const idle = new Idle(500);
    const view1 = idle.setup();
    const view2 = idle.setup();
    expect(view1).toBe(view2);
    idle.onUnmount();
    vi.useRealTimers();
  });

  it("setup() called twice registers activity listeners only once", () => {
    vi.useFakeTimers();
    const add = vi.spyOn(window, "addEventListener");
    const idle = new Idle(500);
    idle.setup();
    idle.setup();
    const moveCalls = add.mock.calls.filter((c) => c[0] === "mousemove").length;
    expect(moveCalls).toBe(1);
    idle.onUnmount();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });
});
