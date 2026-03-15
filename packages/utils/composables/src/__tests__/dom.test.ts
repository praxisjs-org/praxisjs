// @vitest-environment jsdom
import { describe, it, expect } from "vitest";

import { createRef, useWindowSize, useScrollPosition, useFocus } from "../dom";

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
});
