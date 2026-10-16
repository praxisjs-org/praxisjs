// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";

import { effect } from "@praxisjs/core/internal";

import { WindowSize, ScrollPosition, ElementSize, Intersection, Focus } from "../dom";

// ── WindowSize ────────────────────────────────────────────────────────────────

describe("WindowSize", () => {
  it("reads initial window dimensions", () => {
    Object.defineProperty(window, "innerWidth", { value: 1024, configurable: true });
    Object.defineProperty(window, "innerHeight", { value: 768, configurable: true });

    const ws = new WindowSize();
    const { width, height } = ws.setup() as { width: () => number; height: () => number };
    expect(width()).toBe(1024);
    expect(height()).toBe(768);
  });

  it("updates on resize event", () => {
    Object.defineProperty(window, "innerWidth", { value: 800, configurable: true });
    Object.defineProperty(window, "innerHeight", { value: 600, configurable: true });

    const ws = new WindowSize();
    const { width, height } = ws.setup() as { width: () => number; height: () => number };
    ws.onMount();

    Object.defineProperty(window, "innerWidth", { value: 1280, configurable: true });
    Object.defineProperty(window, "innerHeight", { value: 900, configurable: true });
    window.dispatchEvent(new Event("resize"));

    expect(width()).toBe(1280);
    expect(height()).toBe(900);
    ws.onUnmount();
  });

  it("removes listener on unmount", () => {
    const remove = vi.spyOn(window, "removeEventListener");
    const ws = new WindowSize();
    ws.setup();
    ws.onUnmount();
    expect(remove).toHaveBeenCalledWith("resize", expect.any(Function));
  });
});

// ── ScrollPosition ────────────────────────────────────────────────────────────

describe("ScrollPosition", () => {
  it("starts at (0, 0)", () => {
    const sp = new ScrollPosition(window);
    const { x, y } = sp.setup() as { x: () => number; y: () => number };
    expect(x()).toBe(0);
    expect(y()).toBe(0);
  });

  it("updates on scroll event for window", () => {
    const sp = new ScrollPosition(window);
    const { x, y } = sp.setup() as { x: () => number; y: () => number };
    sp.onMount();

    Object.defineProperty(window, "scrollX", { value: 100, configurable: true });
    Object.defineProperty(window, "scrollY", { value: 200, configurable: true });
    window.dispatchEvent(new Event("scroll"));

    expect(x()).toBe(100);
    expect(y()).toBe(200);
  });

  it("updates on scroll event for element", () => {
    const el = document.createElement("div");
    const sp = new ScrollPosition(el);
    const { x, y } = sp.setup() as { x: () => number; y: () => number };
    sp.onMount();

    Object.defineProperty(el, "scrollLeft", { value: 50, configurable: true });
    Object.defineProperty(el, "scrollTop", { value: 75, configurable: true });
    el.dispatchEvent(new Event("scroll"));

    expect(x()).toBe(50);
    expect(y()).toBe(75);
  });

  it("removes listener on unmount", () => {
    const el = document.createElement("div");
    const remove = vi.spyOn(el, "removeEventListener");
    const sp = new ScrollPosition(el);
    sp.setup();
    sp.onMount();
    sp.onUnmount();
    expect(remove).toHaveBeenCalledWith("scroll", expect.any(Function));
  });
});

// ── ElementSize ───────────────────────────────────────────────────────────────

describe("ElementSize", () => {
  let observerCallback: ResizeObserverCallback;

  beforeEach(() => {
    vi.stubGlobal("ResizeObserver", class {
      constructor(cb: ResizeObserverCallback) { observerCallback = cb; }
      observe = vi.fn();
      disconnect = vi.fn();
    });
  });

  it("starts at (0, 0) with no element", () => {
    const ref = { current: null };
    const es = new ElementSize(ref);
    const { width, height } = es.setup() as { width: () => number; height: () => number };
    expect(width()).toBe(0);
    expect(height()).toBe(0);
  });

  it("updates via ResizeObserver callback", () => {
    const el = document.createElement("div");
    const ref = { current: el };
    const es = new ElementSize(ref);
    const { width, height } = es.setup() as { width: () => number; height: () => number };
    es.onMount();

    observerCallback(
      [{ contentRect: { width: 300, height: 150 } } as ResizeObserverEntry],
      {} as ResizeObserver,
    );

    expect(width()).toBe(300);
    expect(height()).toBe(150);
  });

  it("disconnects observer on unmount", () => {
    const disconnect = vi.fn();
    vi.stubGlobal("ResizeObserver", class {
      constructor(cb: ResizeObserverCallback) { observerCallback = cb; }
      observe = vi.fn();
      disconnect = disconnect;
    });

    const es = new ElementSize({ current: document.createElement("div") });
    es.setup();
    es.onMount();
    es.onUnmount();
    expect(disconnect).toHaveBeenCalled();
  });

  it("onMount() with null ref is a no-op", () => {
    const ref = { current: null };
    const es = new ElementSize(ref);
    es.setup();
    expect(() => es.onMount()).not.toThrow();
  });
});

// ── Intersection ──────────────────────────────────────────────────────────────

describe("Intersection", () => {
  let observerCallback: IntersectionObserverCallback;

  beforeEach(() => {
    vi.stubGlobal("IntersectionObserver", class {
      constructor(cb: IntersectionObserverCallback) { observerCallback = cb; }
      observe = vi.fn();
      disconnect = vi.fn();
    });
  });

  it("starts as not visible", () => {
    const ref = { current: null };
    const int = new Intersection(ref);
    const { visible } = int.setup() as { visible: () => boolean };
    expect(visible()).toBe(false);
  });

  it("becomes visible when intersecting", () => {
    const el = document.createElement("div");
    const ref = { current: el };
    const int = new Intersection(ref);
    const { visible } = int.setup() as { visible: () => boolean };
    int.onMount();

    observerCallback(
      [{ isIntersecting: true } as IntersectionObserverEntry],
      {} as IntersectionObserver,
    );

    expect(visible()).toBe(true);
  });

  it("disconnects on unmount", () => {
    const disconnect = vi.fn();
    vi.stubGlobal("IntersectionObserver", class {
      constructor(cb: IntersectionObserverCallback) { observerCallback = cb; }
      observe = vi.fn();
      disconnect = disconnect;
    });

    const int = new Intersection({ current: document.createElement("div") });
    int.setup();
    int.onMount();
    int.onUnmount();
    expect(disconnect).toHaveBeenCalled();
  });

  it("onMount() calls observe() with the element", () => {
    const observeFn = vi.fn();
    vi.stubGlobal("IntersectionObserver", class {
      constructor(cb: IntersectionObserverCallback) { observerCallback = cb; }
      observe = observeFn;
      disconnect = vi.fn();
    });

    const el = document.createElement("div");
    const ref = { current: el };
    const int = new Intersection(ref);
    int.setup();
    int.onMount();

    expect(observeFn).toHaveBeenCalledWith(el);
  });

  it("onMount() does nothing when ref is null", () => {
    const observeFn = vi.fn();
    vi.stubGlobal("IntersectionObserver", class {
      constructor(cb: IntersectionObserverCallback) { observerCallback = cb; }
      observe = observeFn;
      disconnect = vi.fn();
    });

    const ref = { current: null };
    const int = new Intersection(ref);
    int.setup();
    expect(() => int.onMount()).not.toThrow();
    expect(observeFn).not.toHaveBeenCalled();
  });
});

// ── ElementSize (additional) ──────────────────────────────────────────────────

describe("ElementSize (additional)", () => {
  it("ref.current changes to a new element: old observer is disconnected and new one started", () => {
    const disconnectFn = vi.fn();
    const observeFn = vi.fn();

    vi.stubGlobal("ResizeObserver", class {
      observe = observeFn;
      disconnect = disconnectFn;
    });

    const el1 = document.createElement("div");
    const ref = { current: el1 as HTMLElement | null };
    const es = new ElementSize(ref);
    es.setup();
    es.onMount();

    // Disconnect old observer and create new one for el2
    es.onUnmount();
    expect(disconnectFn).toHaveBeenCalled();

    const el2 = document.createElement("div");
    ref.current = el2;
    const es2 = new ElementSize(ref);
    es2.setup();
    es2.onMount();
    expect(observeFn).toHaveBeenCalledWith(el2);
  });
});

// ── Intersection (additional) ─────────────────────────────────────────────────

describe("Intersection (additional)", () => {
  let observerCallback: IntersectionObserverCallback;

  beforeEach(() => {
    vi.stubGlobal("IntersectionObserver", class {
      constructor(cb: IntersectionObserverCallback) { observerCallback = cb; }
      observe = vi.fn();
      disconnect = vi.fn();
    });
  });

  it("visibility toggles false after being true", () => {
    const el = document.createElement("div");
    const ref = { current: el };
    const int = new Intersection(ref);
    const { visible } = int.setup() as { visible: () => boolean };
    int.onMount();

    observerCallback(
      [{ isIntersecting: true } as IntersectionObserverEntry],
      {} as IntersectionObserver,
    );
    expect(visible()).toBe(true);

    observerCallback(
      [{ isIntersecting: false } as IntersectionObserverEntry],
      {} as IntersectionObserver,
    );
    expect(visible()).toBe(false);
  });
});

// ── ScrollPosition (ref-based) ────────────────────────────────────────────────

describe("ScrollPosition (ref-based)", () => {
  it("accepts a ref object and reads scrollLeft/scrollTop from it", () => {
    const el = document.createElement("div");
    const ref = { current: el };
    const sp = new ScrollPosition(ref);
    const { x, y } = sp.setup() as { x: () => number; y: () => number };
    sp.onMount();

    Object.defineProperty(el, "scrollLeft", { value: 30, configurable: true });
    Object.defineProperty(el, "scrollTop", { value: 60, configurable: true });
    el.dispatchEvent(new Event("scroll"));

    expect(x()).toBe(30);
    expect(y()).toBe(60);
  });

  it("uses ref.current at mount time — subsequent current changes do not affect the listener target", () => {
    const el = document.createElement("div");
    const ref = { current: el as HTMLElement | null };
    const sp = new ScrollPosition(ref);
    sp.setup();
    sp.onMount();

    const remove = vi.spyOn(el, "removeEventListener");
    sp.onUnmount();
    expect(remove).toHaveBeenCalledWith("scroll", expect.any(Function));
  });

  it("falls back to window when ref.current is null at mount time", () => {
    const ref = { current: null as HTMLElement | null };
    const sp = new ScrollPosition(ref);
    sp.setup();
    // Should not throw; _target falls back to window
    expect(() => sp.onMount()).not.toThrow();
    sp.onUnmount();
  });
});

// ── ScrollPosition (additional) ───────────────────────────────────────────────

describe("ScrollPosition (additional)", () => {
  it("onMount() called twice registers only one scroll listener", () => {
    const el = document.createElement("div");
    const add = vi.spyOn(el, "addEventListener");
    const sp = new ScrollPosition(el);
    sp.setup();
    sp.onMount();
    sp.onMount(); // second call must be a no-op
    const scrollCalls = add.mock.calls.filter((c) => c[0] === "scroll").length;
    expect(scrollCalls).toBe(1);
  });
});

// ── Focus ─────────────────────────────────────────────────────────────────────

describe("Focus", () => {
  it("starts as not focused", () => {
    const el = document.createElement("input");
    const ref = { current: el };
    const focus = new Focus(ref);
    const { focused } = focus.setup() as { focused: () => boolean };
    expect(focused()).toBe(false);
  });

  it("sets focused=true on focus event", () => {
    const el = document.createElement("input");
    document.body.appendChild(el);
    const ref = { current: el };
    const focus = new Focus(ref);
    const { focused } = focus.setup() as { focused: () => boolean };
    focus.onMount();

    el.dispatchEvent(new Event("focus"));
    expect(focused()).toBe(true);

    document.body.removeChild(el);
  });

  it("sets focused=false on blur event", () => {
    const el = document.createElement("input");
    document.body.appendChild(el);
    const ref = { current: el };
    const focus = new Focus(ref);
    const { focused } = focus.setup() as { focused: () => boolean };
    focus.onMount();

    el.dispatchEvent(new Event("focus"));
    el.dispatchEvent(new Event("blur"));
    expect(focused()).toBe(false);

    document.body.removeChild(el);
  });

  it("does not throw when ref is null", () => {
    const ref = { current: null };
    const focus = new Focus(ref);
    expect(() => focus.setup()).not.toThrow();
  });

  it("onMount() with null ref is a no-op", () => {
    const ref = { current: null };
    const focus = new Focus(ref);
    focus.setup();
    expect(() => focus.onMount()).not.toThrow();
  });

  it("onUnmount() with null ref is a no-op", () => {
    const ref = { current: null };
    const focus = new Focus(ref);
    focus.setup();
    expect(() => focus.onUnmount()).not.toThrow();
  });

  it("removes focus/blur listeners on unmount", () => {
    const el = document.createElement("input");
    document.body.appendChild(el);
    const ref = { current: el };
    const focus = new Focus(ref);
    focus.setup();
    focus.onMount();

    const remove = vi.spyOn(el, "removeEventListener");
    focus.onUnmount();

    expect(remove).toHaveBeenCalledWith("focus", expect.any(Function));
    expect(remove).toHaveBeenCalledWith("blur", expect.any(Function));

    document.body.removeChild(el);
  });

  it("onMount() called twice registers only one listener pair", () => {
    const el = document.createElement("input");
    document.body.appendChild(el);
    const add = vi.spyOn(el, "addEventListener");
    const ref = { current: el };
    const focus = new Focus(ref);
    focus.setup();
    focus.onMount();
    focus.onMount(); // second call must be a no-op
    const focusCalls = add.mock.calls.filter((c) => c[0] === "focus").length;
    expect(focusCalls).toBe(1);
    document.body.removeChild(el);
  });
});

// ── WindowSize (additional) ───────────────────────────────────────────────────

describe("WindowSize (additional)", () => {
  it("setup() called twice exposes the same signals", () => {
    const ws = new WindowSize();
    const view1 = ws.setup();
    const view2 = ws.setup();
    expect(view1.width).toBe(view2.width);
    expect(view1.height).toBe(view2.height);
  });

  it("listens only between mount and unmount", () => {
    const add = vi.spyOn(window, "addEventListener");
    const ws = new WindowSize();
    ws.setup();
    ws.setup();
    expect(add.mock.calls.filter((c) => c[0] === "resize").length).toBe(0);
    ws.onMount();
    expect(add.mock.calls.filter((c) => c[0] === "resize").length).toBe(1);
    ws.onUnmount();
    vi.restoreAllMocks();
  });

  it("re-reads the window size on mount", () => {
    const ws = new WindowSize();
    const { width } = ws.setup() as { width: () => number };
    Object.defineProperty(window, "innerWidth", { value: 640, configurable: true });
    ws.onMount();
    expect(width()).toBe(640);
    ws.onUnmount();
  });
});

// ── ElementSize (cache) ───────────────────────────────────────────────────────

describe("ElementSize (cache)", () => {
  it("setup() called twice exposes the same signals", () => {
    const es = new ElementSize({ current: document.createElement("div") });
    expect(es.setup().width).toBe(es.setup().width);
  });

  it("creates its ResizeObserver on first mount and reuses it", () => {
    let created = 0;
    const observe = vi.fn();
    vi.stubGlobal("ResizeObserver", class {
      constructor() { created++; }
      observe = observe;
      disconnect = vi.fn();
    });
    const es = new ElementSize({ current: document.createElement("div") });
    es.setup();
    expect(created).toBe(0);
    es.onMount();
    es.onUnmount();
    es.onMount();
    expect(created).toBe(1);
    expect(observe).toHaveBeenCalledTimes(2);
    vi.unstubAllGlobals();
  });
});

// ── Intersection (cache) ──────────────────────────────────────────────────────

describe("Intersection (cache)", () => {
  it("setup() called twice exposes the same signal", () => {
    const inter = new Intersection({ current: document.createElement("div") });
    expect(inter.setup().visible).toBe(inter.setup().visible);
  });
});

// ── ScrollPosition (_staticTarget ?? window fallback) ─────────────────────────

describe("ScrollPosition (_staticTarget fallback)", () => {
  it("falls back to window when _staticTarget is undefined", () => {
    // Default constructor sets _staticTarget = window. After construction we
    // forcibly clear it to undefined (bypassing TypeScript's `private readonly`)
    // so _resolveTarget() exercises the final `return window` branch.
    const sp = new ScrollPosition();
    (sp as unknown as Record<string, unknown>)._staticTarget = undefined;
    sp.setup();
    const addSpy = vi.spyOn(window, "addEventListener");
    sp.onMount();
    const scrollCall = addSpy.mock.calls.find((c) => c[0] === "scroll");
    expect(scrollCall).toBeDefined(); // proves _resolveTarget() hit the window fallback
    addSpy.mockRestore();
    sp.onUnmount();
  });
});

describe("paired updates re-run dependents once per event", () => {
  function countRuns(read: () => void) {
    let runs = 0;
    effect(() => {
      read();
      runs++;
    });
    runs = 0;
    return () => runs;
  }

  it("WindowSize", () => {
    const ws = new WindowSize();
    const { width, height } = ws.setup() as { width: () => number; height: () => number };
    ws.onMount();
    const runs = countRuns(() => { void width(); void height(); });
    Object.defineProperty(window, "innerWidth", { value: 111, configurable: true });
    Object.defineProperty(window, "innerHeight", { value: 222, configurable: true });
    window.dispatchEvent(new Event("resize"));
    expect(runs()).toBe(1);
    ws.onUnmount();
  });

  it("ScrollPosition", () => {
    const sp = new ScrollPosition(window);
    const { x, y } = sp.setup() as { x: () => number; y: () => number };
    sp.onMount();
    const runs = countRuns(() => { void x(); void y(); });
    Object.defineProperty(window, "scrollX", { value: 7, configurable: true });
    Object.defineProperty(window, "scrollY", { value: 9, configurable: true });
    window.dispatchEvent(new Event("scroll"));
    expect(runs()).toBe(1);
    sp.onUnmount();
  });

  it("ElementSize", () => {
    let callback!: ResizeObserverCallback;
    vi.stubGlobal("ResizeObserver", class {
      constructor(cb: ResizeObserverCallback) { callback = cb; }
      observe = vi.fn();
      disconnect = vi.fn();
    });
    const es = new ElementSize({ current: document.createElement("div") });
    const { width, height } = es.setup() as { width: () => number; height: () => number };
    es.onMount();
    const runs = countRuns(() => { void width(); void height(); });
    callback([{ contentRect: { width: 10, height: 20 } } as ResizeObserverEntry], {} as ResizeObserver);
    expect(runs()).toBe(1);
    vi.unstubAllGlobals();
  });
});

// ── Detaching from what was attached ──────────────────────────────────────────

describe("listeners are removed from the element they were added to", () => {
  // Bug: onUnmount re-read ref.current, so a ref that changed after mount left the listener on
  // the old element.
  it("ScrollPosition", () => {
    const el1 = document.createElement("div");
    const el2 = document.createElement("div");
    const ref = { current: el1 as HTMLElement | null };
    const sp = new ScrollPosition(ref);
    const { y } = sp.setup() as { y: () => number };
    sp.onMount();
    ref.current = el2;
    sp.onUnmount();

    Object.defineProperty(el1, "scrollTop", { value: 40, configurable: true });
    el1.dispatchEvent(new Event("scroll"));
    expect(y()).toBe(0);
  });

  it("Focus", () => {
    const el1 = document.createElement("input");
    const el2 = document.createElement("input");
    const ref = { current: el1 as HTMLElement | null };
    const focus = new Focus(ref);
    const { focused } = focus.setup() as { focused: () => boolean };
    focus.onMount();
    ref.current = el2;
    focus.onUnmount();

    el1.dispatchEvent(new Event("focus"));
    expect(focused()).toBe(false);
  });
});

describe("initial state read on mount", () => {
  it("ScrollPosition reads the target's current scroll offset", () => {
    const el = document.createElement("div");
    Object.defineProperty(el, "scrollLeft", { value: 12, configurable: true });
    Object.defineProperty(el, "scrollTop", { value: 34, configurable: true });
    const sp = new ScrollPosition(el);
    const { x, y } = sp.setup() as { x: () => number; y: () => number };
    sp.onMount();
    expect([x(), y()]).toEqual([12, 34]);
    sp.onUnmount();
  });

  it("Focus reports an element that is already focused", () => {
    const el = document.createElement("input");
    document.body.appendChild(el);
    el.focus();
    const focus = new Focus({ current: el });
    const { focused } = focus.setup() as { focused: () => boolean };
    focus.onMount();
    expect(focused()).toBe(true);
    focus.onUnmount();
    el.remove();
  });

  it("a scroll event after unmount is ignored", () => {
    const el = document.createElement("div");
    const sp = new ScrollPosition(el);
    const { y } = sp.setup() as { y: () => number };
    sp.onMount();
    const handler = (sp as unknown as { _onScroll: () => void })._onScroll;
    sp.onUnmount();
    Object.defineProperty(el, "scrollTop", { value: 99, configurable: true });
    handler();
    expect(y()).toBe(0);
  });
});
