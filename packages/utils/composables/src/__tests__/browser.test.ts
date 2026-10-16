// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import type { Composable } from "@praxisjs/core";
import { effect } from "@praxisjs/core/internal";

import { MediaQuery, ColorScheme, Mouse, KeyCombo, Idle } from "../browser";

// Sets a composable up and mounts it, as @Compose does; everything mounted is unmounted after each test.
const mounted: Composable[] = [];
function mount<T extends Composable>(composable: T): ReturnType<T["setup"]> {
  const view = composable.setup() as ReturnType<T["setup"]>;
  composable.onMount?.();
  mounted.push(composable);
  return view;
}
afterEach(() => {
  for (const composable of mounted.splice(0)) composable.onUnmount?.();
});

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
    const { matches } = mount(mq) as { matches: () => boolean };
    expect(matches()).toBe(true);
  });

  it("updates matches when change event fires", () => {
    let changeHandler: ((e: MediaQueryListEvent) => void) | undefined;
    mockMatchMedia(false, (_: string, fn) => { changeHandler = fn; });

    const mq = new MediaQuery("(min-width: 768px)");
    const { matches } = mount(mq) as { matches: () => boolean };
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
    const { isDark, isLight } = mount(cs) as { isDark: () => boolean; isLight: () => boolean };

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
    const { x, y } = mount(mouse) as { x: () => number; y: () => number };
    expect(x()).toBe(0);
    expect(y()).toBe(0);
  });

  it("updates x and y on mousemove", () => {
    const mouse = new Mouse();
    const { x, y } = mount(mouse) as { x: () => number; y: () => number };

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
    const { pressed } = mount(kc) as { pressed: () => boolean };
    expect(pressed()).toBe(false);
  });

  it("sets pressed=true when matching combo is pressed", () => {
    const kc = new KeyCombo("ctrl+s");
    const { pressed } = mount(kc) as { pressed: () => boolean };

    window.dispatchEvent(new KeyboardEvent("keydown", { ctrlKey: true, key: "s" }));
    expect(pressed()).toBe(true);
  });

  it("resets pressed on keyup", () => {
    const kc = new KeyCombo("ctrl+s");
    const { pressed } = mount(kc) as { pressed: () => boolean };

    window.dispatchEvent(new KeyboardEvent("keydown", { ctrlKey: true, key: "s" }));
    window.dispatchEvent(new KeyboardEvent("keyup"));
    expect(pressed()).toBe(false);
  });

  it("does not set pressed for wrong key", () => {
    const kc = new KeyCombo("ctrl+s");
    const { pressed } = mount(kc) as { pressed: () => boolean };

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
    const { pressed } = mount(kc) as { pressed: () => boolean };
    // No ctrlKey needed — parts doesn't include "ctrl" so ctrl = true always
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "s" }));
    expect(pressed()).toBe(true);
  });

  it("matches combo with shift modifier (shift branch: `e.shiftKey`)", () => {
    const kc = new KeyCombo("ctrl+shift+s");
    const { pressed } = mount(kc) as { pressed: () => boolean };
    window.dispatchEvent(new KeyboardEvent("keydown", { ctrlKey: true, shiftKey: true, key: "s" }));
    expect(pressed()).toBe(true);
  });

  it("does not match when shift is required but not pressed", () => {
    const kc = new KeyCombo("ctrl+shift+s");
    const { pressed } = mount(kc) as { pressed: () => boolean };
    window.dispatchEvent(new KeyboardEvent("keydown", { ctrlKey: true, shiftKey: false, key: "s" }));
    expect(pressed()).toBe(false);
  });

  it("matches combo with alt modifier (alt branch: `e.altKey`)", () => {
    const kc = new KeyCombo("ctrl+alt+s");
    const { pressed } = mount(kc) as { pressed: () => boolean };
    window.dispatchEvent(new KeyboardEvent("keydown", { ctrlKey: true, altKey: true, key: "s" }));
    expect(pressed()).toBe(true);
  });
});

// ── Idle ──────────────────────────────────────────────────────────────────────

describe("Idle", () => {
  it("starts as not idle", () => {
    vi.useFakeTimers();
    const idle = new Idle(500);
    const { idle: isIdle } = mount(idle) as { idle: () => boolean };
    expect(isIdle()).toBe(false);
    vi.useRealTimers();
  });

  it("becomes idle after timeout", () => {
    vi.useFakeTimers();
    const composable = new Idle(500);
    const { idle: isIdle } = mount(composable) as { idle: () => boolean };
    vi.advanceTimersByTime(500);
    expect(isIdle()).toBe(true);
    vi.useRealTimers();
  });

  it("resets idle timer on activity", () => {
    vi.useFakeTimers();
    const composable = new Idle(500);
    const { idle: isIdle } = mount(composable) as { idle: () => boolean };
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
    const { idle: isIdle } = mount(composable) as { idle: () => boolean };
    vi.advanceTimersByTime(500);
    expect(isIdle()).toBe(true);
    window.dispatchEvent(new Event("scroll"));
    expect(isIdle()).toBe(false);
    vi.useRealTimers();
  });

  it("fires on click event", () => {
    vi.useFakeTimers();
    const composable = new Idle(500);
    const { idle: isIdle } = mount(composable) as { idle: () => boolean };
    vi.advanceTimersByTime(500);
    expect(isIdle()).toBe(true);
    window.dispatchEvent(new MouseEvent("click"));
    expect(isIdle()).toBe(false);
    vi.useRealTimers();
  });

  it("fires on keydown event", () => {
    vi.useFakeTimers();
    const composable = new Idle(500);
    const { idle: isIdle } = mount(composable) as { idle: () => boolean };
    vi.advanceTimersByTime(500);
    expect(isIdle()).toBe(true);
    window.dispatchEvent(new KeyboardEvent("keydown"));
    expect(isIdle()).toBe(false);
    vi.useRealTimers();
  });

  it("activity after becoming idle resets the timer", () => {
    vi.useFakeTimers();
    const composable = new Idle(500);
    const { idle: isIdle } = mount(composable) as { idle: () => boolean };
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
    const { pressed } = mount(kc) as { pressed: () => boolean };
    window.dispatchEvent(new KeyboardEvent("keydown", { metaKey: true, key: "s" }));
    expect(pressed()).toBe(true);
  });

  it("modifier-only combo (ctrl+shift) — keyup resets pressed to false", () => {
    const kc = new KeyCombo("ctrl+shift");
    const { pressed } = mount(kc) as { pressed: () => boolean };
    // Fire keyup to cover the _keyupHandler arrow function inside the !key branch
    window.dispatchEvent(new KeyboardEvent("keyup"));
    expect(pressed()).toBe(false);
  });

  it("modifier-only combo (ctrl+shift) never fires", () => {
    const kc = new KeyCombo("ctrl+shift");
    const { pressed } = mount(kc) as { pressed: () => boolean };
    window.dispatchEvent(new KeyboardEvent("keydown", { ctrlKey: true, shiftKey: true, key: "Control" }));
    window.dispatchEvent(new KeyboardEvent("keydown", { ctrlKey: true, shiftKey: true, key: "Shift" }));
    window.dispatchEvent(new KeyboardEvent("keydown", { ctrlKey: true, shiftKey: true, key: "a" }));
    expect(pressed()).toBe(false);
  });

  it("whitespace in combo string (ctrl + s) is handled gracefully — fires on ctrl+s", () => {
    // Parts are trimmed, so "ctrl + s" becomes ["ctrl", "s"] after trim
    const kc = new KeyCombo("ctrl + s");
    const { pressed } = mount(kc) as { pressed: () => boolean };
    window.dispatchEvent(new KeyboardEvent("keydown", { ctrlKey: true, key: "s" }));
    expect(pressed()).toBe(true);
  });

  it("mounting twice and unmounting once leaves no listener behind", () => {
    const kc = new KeyCombo("ctrl+s");
    const { pressed } = mount(kc) as { pressed: () => boolean };
    kc.onMount();
    kc.onMount();
    kc.onUnmount();
    window.dispatchEvent(new KeyboardEvent("keydown", { ctrlKey: true, key: "s" }));
    expect(pressed()).toBe(false);
  });
});

// ── MediaQuery (additional) ───────────────────────────────────────────────────

describe("MediaQuery (additional)", () => {
  beforeEach(() => { vi.restoreAllMocks(); });

  it("setup() called twice queries once and mounting registers one listener", () => {
    const mql = mockMatchMedia(false);
    const matchMedia = vi.spyOn(window, "matchMedia");
    const mq = new MediaQuery("(min-width: 768px)");
    mq.setup();
    mount(mq);
    expect(matchMedia).toHaveBeenCalledTimes(1);
    expect((mql.addEventListener as ReturnType<typeof vi.fn>)).toHaveBeenCalledTimes(1);
  });

  it("re-reads the match state on mount", () => {
    const mql = mockMatchMedia(false);
    const mq = new MediaQuery("(min-width: 768px)");
    const { matches } = mq.setup() as { matches: () => boolean };
    (mql as { matches: boolean }).matches = true;
    mq.onMount();
    expect(matches()).toBe(true);
    mq.onUnmount();
  });

  it("does not listen before it is mounted", () => {
    const mql = mockMatchMedia(false);
    new MediaQuery("(min-width: 768px)").setup();
    expect((mql.addEventListener as ReturnType<typeof vi.fn>)).not.toHaveBeenCalled();
  });
});

// ── ColorScheme (additional) ──────────────────────────────────────────────────

describe("ColorScheme (additional)", () => {
  beforeEach(() => { vi.restoreAllMocks(); });

  it("mounting registers one listener", () => {
    const mql = mockMatchMedia(false);
    mount(new ColorScheme());
    expect((mql.addEventListener as ReturnType<typeof vi.fn>)).toHaveBeenCalledTimes(1);
  });
});

// ── Mouse (additional) ────────────────────────────────────────────────────────

describe("Mouse (additional)", () => {
  it("setup() called twice exposes the same signals", () => {
    const mouse = new Mouse();
    const view1 = mouse.setup();
    const view2 = mouse.setup();
    expect(view1.x).toBe(view2.x);
    expect(view1.y).toBe(view2.y);
  });

  it("does not listen before it is mounted", () => {
    const mouse = new Mouse();
    const { x } = mouse.setup() as { x: () => number };
    window.dispatchEvent(new MouseEvent("mousemove", { clientX: 9, clientY: 9 }));
    expect(x()).toBe(0);
  });
});

// ── Idle (additional) ─────────────────────────────────────────────────────────

describe("Idle (additional)", () => {
  afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

  it("setup() called twice exposes the same signal", () => {
    const idle = new Idle(500);
    expect(idle.setup().idle).toBe(idle.setup().idle);
  });

  it("does not start its timer before it is mounted", () => {
    vi.useFakeTimers();
    const { idle } = new Idle(500).setup() as { idle: () => boolean };
    vi.advanceTimersByTime(1000);
    expect(idle()).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("keeps a single pending timer however many activity events arrive", () => {
    vi.useFakeTimers();
    const setTimeoutSpy = vi.spyOn(globalThis, "setTimeout");
    const composable = new Idle(500);
    const { idle } = mount(composable) as { idle: () => boolean };
    for (let i = 0; i < 50; i++) {
      vi.advanceTimersByTime(5);
      window.dispatchEvent(new MouseEvent("mousemove"));
    }
    expect(setTimeoutSpy).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(1);
    // 250ms since mount, the last activity just now: idle exactly 500ms after it.
    vi.advanceTimersByTime(499);
    expect(idle()).toBe(false);
    vi.advanceTimersByTime(1);
    expect(idle()).toBe(true);
  });

  it("stops its timer and listeners on unmount", () => {
    vi.useFakeTimers();
    const composable = new Idle(500);
    const { idle } = composable.setup() as { idle: () => boolean };
    composable.onMount();
    composable.onUnmount();
    expect(vi.getTimerCount()).toBe(0);
    window.dispatchEvent(new MouseEvent("mousemove"));
    vi.advanceTimersByTime(1000);
    expect(idle()).toBe(false);
  });

  it("re-mounting restarts the countdown", () => {
    vi.useFakeTimers();
    const composable = new Idle(500);
    const { idle } = mount(composable) as { idle: () => boolean };
    vi.advanceTimersByTime(500);
    expect(idle()).toBe(true);
    composable.onUnmount();
    composable.onMount();
    expect(idle()).toBe(false);
    expect(vi.getTimerCount()).toBe(1);
  });
});

describe("Mouse paired updates", () => {
  it("re-runs dependents once per mousemove", () => {
    const mouse = new Mouse();
    const { x, y } = mount(mouse) as { x: () => number; y: () => number };
    let runs = 0;
    effect(() => {
      void x();
      void y();
      runs++;
    });
    runs = 0;
    window.dispatchEvent(new MouseEvent("mousemove", { clientX: 5, clientY: 6 }));
    expect(runs).toBe(1);
    mouse.onUnmount();
  });
});
