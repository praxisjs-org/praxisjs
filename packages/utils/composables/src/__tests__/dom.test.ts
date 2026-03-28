// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";

import { signal } from "@praxisjs/core/internal";

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

    Object.defineProperty(window, "innerWidth", { value: 1280, configurable: true });
    Object.defineProperty(window, "innerHeight", { value: 900, configurable: true });
    window.dispatchEvent(new Event("resize"));

    expect(width()).toBe(1280);
    expect(height()).toBe(900);
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

    const ref = { current: null };
    const es = new ElementSize(ref);
    es.setup();
    es.onUnmount();
    expect(disconnect).toHaveBeenCalled();
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

    const ref = { current: null };
    const int = new Intersection(ref);
    int.setup();
    int.onUnmount();
    expect(disconnect).toHaveBeenCalled();
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

  it("removes focus/blur listeners when reactive ref changes (effect cleanup)", () => {
    const el1 = document.createElement("input");
    document.body.appendChild(el1);

    // Make ref.current reactive so the effect tracks it and re-runs on change
    const refSignal = signal<HTMLElement | null>(el1);
    const ref = { get current() { return refSignal(); } };

    const focus = new Focus(ref);
    focus.setup();

    const removeEl1 = vi.spyOn(el1, "removeEventListener");

    // Changing the signal causes the effect to re-run, calling cleanup for el1
    // This covers the cleanup function at dom.ts:134-135
    const el2 = document.createElement("input");
    document.body.appendChild(el2);
    refSignal.set(el2);

    expect(removeEl1).toHaveBeenCalledWith("focus", expect.any(Function));
    expect(removeEl1).toHaveBeenCalledWith("blur", expect.any(Function));

    document.body.removeChild(el1);
    document.body.removeChild(el2);
  });
});
