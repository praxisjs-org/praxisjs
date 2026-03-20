// @vitest-environment jsdom
import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";

import { createRef, useWindowSize, useScrollPosition, useFocus, useElementSize, useIntersection } from "../dom";

// ---------- createRef ----------

describe("createRef", () => {
  it("starts with current = null", () => {
    const ref = createRef();
    expect(ref.current).toBeNull();
  });

  it("can be assigned an element", () => {
    const ref = createRef();
    const el = document.createElement("div");
    ref.current = el;
    expect(ref.current).toBe(el);
  });
});

// ---------- useWindowSize ----------

describe("useWindowSize", () => {
  it("returns the current window dimensions", () => {
    Object.defineProperty(window, "innerWidth", { writable: true, configurable: true, value: 1024 });
    Object.defineProperty(window, "innerHeight", { writable: true, configurable: true, value: 768 });

    const { width, height } = useWindowSize();
    expect(width()).toBe(1024);
    expect(height()).toBe(768);
  });

  it("updates on resize event", () => {
    Object.defineProperty(window, "innerWidth", { writable: true, configurable: true, value: 800 });
    Object.defineProperty(window, "innerHeight", { writable: true, configurable: true, value: 600 });

    const { width, height } = useWindowSize();

    Object.defineProperty(window, "innerWidth", { writable: true, configurable: true, value: 1280 });
    Object.defineProperty(window, "innerHeight", { writable: true, configurable: true, value: 720 });
    window.dispatchEvent(new Event("resize"));

    expect(width()).toBe(1280);
    expect(height()).toBe(720);
  });
});

// ---------- useScrollPosition ----------

describe("useScrollPosition", () => {
  it("starts at (0, 0)", () => {
    const { x, y } = useScrollPosition(window);
    expect(x()).toBe(0);
    expect(y()).toBe(0);
  });

  it("updates on element scroll", () => {
    const el = document.createElement("div");
    const { x, y } = useScrollPosition(el);

    Object.defineProperty(el, "scrollLeft", { configurable: true, value: 50 });
    Object.defineProperty(el, "scrollTop", { configurable: true, value: 80 });
    el.dispatchEvent(new Event("scroll"));

    expect(x()).toBe(50);
    expect(y()).toBe(80);
  });
});

// ---------- useFocus ----------

describe("useFocus", () => {
  it("starts as not focused", () => {
    const el = document.createElement("input");
    document.body.appendChild(el);
    const ref = { current: el };
    const focused = useFocus(ref);
    expect(focused()).toBe(false);
    document.body.removeChild(el);
  });

  it("becomes true on focus event", () => {
    const el = document.createElement("input");
    document.body.appendChild(el);
    const ref = { current: el };
    const focused = useFocus(ref);
    el.dispatchEvent(new FocusEvent("focus"));
    expect(focused()).toBe(true);
    document.body.removeChild(el);
  });

  it("becomes false on blur event", () => {
    const el = document.createElement("input");
    document.body.appendChild(el);
    const ref = { current: el };
    const focused = useFocus(ref);
    el.dispatchEvent(new FocusEvent("focus"));
    el.dispatchEvent(new FocusEvent("blur"));
    expect(focused()).toBe(false);
    document.body.removeChild(el);
  });

  it("does nothing when ref.current is null", () => {
    const ref: { current: HTMLElement | null } = { current: null };
    expect(() => useFocus(ref)).not.toThrow();
  });
});

// ---------- useElementSize ----------

describe("useElementSize", () => {
  let observerCallback: ResizeObserverCallback = () => {};
  let mockDisconnect: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockDisconnect = vi.fn();
    observerCallback = () => {};

    // Class-based mock so `new ResizeObserver(cb)` works correctly
    globalThis.ResizeObserver = class {
      constructor(cb: ResizeObserverCallback) { observerCallback = cb; }
      observe = vi.fn();
      disconnect = mockDisconnect;
    } as unknown as typeof ResizeObserver;
  });

  afterEach(() => {
    // @ts-expect-error – removing test stub
    delete globalThis.ResizeObserver;
  });

  it("starts at (0, 0) when ref.current is null", () => {
    const ref: { current: HTMLElement | null } = { current: null };
    const { width, height } = useElementSize(ref);
    expect(width()).toBe(0);
    expect(height()).toBe(0);
  });

  it("calls stop() to disconnect the ResizeObserver", () => {
    const el = document.createElement("div");
    const ref = { current: el };
    const { stop } = useElementSize(ref);
    stop();
    expect(mockDisconnect).toHaveBeenCalled();
  });

  it("updates width and height when ResizeObserver fires", () => {
    const el = document.createElement("div");
    const ref = { current: el };
    const { width, height } = useElementSize(ref);

    observerCallback(
      [{ contentRect: { width: 300, height: 200 } } as ResizeObserverEntry],
      null as unknown as ResizeObserver,
    );

    expect(width()).toBe(300);
    expect(height()).toBe(200);
  });
});

// ---------- useIntersection ----------

describe("useIntersection", () => {
  let intersectionCallback: IntersectionObserverCallback = () => {};
  let capturedOptions: IntersectionObserverInit | undefined;

  beforeEach(() => {
    intersectionCallback = () => {};
    capturedOptions = undefined;

    globalThis.IntersectionObserver = class {
      constructor(cb: IntersectionObserverCallback, opts?: IntersectionObserverInit) {
        intersectionCallback = cb;
        capturedOptions = opts;
      }
      observe = vi.fn();
      disconnect = vi.fn();
    } as unknown as typeof IntersectionObserver;
  });

  afterEach(() => {
    // @ts-expect-error – removing test stub
    delete globalThis.IntersectionObserver;
  });

  it("starts as false when ref.current is null", () => {
    const ref: { current: HTMLElement | null } = { current: null };
    const visible = useIntersection(ref);
    expect(visible()).toBe(false);
  });

  it("becomes true when IntersectionObserver fires with isIntersecting=true", () => {
    const el = document.createElement("div");
    const ref = { current: el };
    const visible = useIntersection(ref);

    intersectionCallback(
      [{ isIntersecting: true } as IntersectionObserverEntry],
      null as unknown as IntersectionObserver,
    );
    expect(visible()).toBe(true);
  });

  it("passes options to IntersectionObserver", () => {
    const ref: { current: HTMLElement | null } = { current: null };
    const options = { threshold: 0.5 };
    useIntersection(ref, options);
    expect(capturedOptions).toEqual(options);
  });
});
