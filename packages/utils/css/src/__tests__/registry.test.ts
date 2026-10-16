// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { injectStyle } from "../internal/registry";
import { createCollector, setCollector } from "../internal/collector";

beforeEach(() => {
  document
    .head
    .querySelectorAll("style[data-praxis-hash]")
    .forEach((el) => el.remove());
  setCollector(null);
});

afterEach(() => {
  document
    .head
    .querySelectorAll("style[data-praxis-hash]")
    .forEach((el) => el.remove());
  setCollector(null);
});

describe("injectStyle", () => {
  it("injects a style element with the given key and css", () => {
    injectStyle("abc", ".a { color: red; }");
    const el = document.head.querySelector("style[data-praxis-hash='abc']");
    expect(el).not.toBeNull();
    expect(el?.textContent).toBe(".a { color: red; }");
  });

  it("is idempotent — one element per key however often it is called", () => {
    injectStyle("k1", ".x { display: flex; }");
    const el = document.head.querySelector("style[data-praxis-hash='k1']");
    injectStyle("k1", ".x { display: flex; }");
    injectStyle("k1", ".x { display: flex; }");
    expect(document.head.querySelectorAll("style[data-praxis-hash='k1']").length).toBe(1);
    expect(document.head.querySelector("style[data-praxis-hash='k1']")).toBe(el);
  });

  it("re-injects when element was removed externally (DOM divergence guard)", () => {
    injectStyle("k3", ".z { color: blue; }");
    document.head.querySelector("style[data-praxis-hash='k3']")?.remove();
    injectStyle("k3", ".z { color: blue; }");
    expect(document.head.querySelectorAll("style[data-praxis-hash='k3']").length).toBe(1);
  });
});

describe("collector mode", () => {
  it("routes injectStyle to the collector when one is active", () => {
    const col = createCollector();
    setCollector(col);
    injectStyle("hash1", ".cls { color: red; }");
    expect(document.head.querySelector("style[data-praxis-hash]")).toBeNull();
    expect(col.getCSS()).toBe(".cls { color: red; }");
  });

  it("deduplicates identical keys in the collector", () => {
    const col = createCollector();
    setCollector(col);
    injectStyle("dup", ".a { }");
    injectStyle("dup", ".a { }");
    expect(col.getCSS().split("\n").filter(Boolean).length).toBe(1);
  });

  it("collector accumulates multiple distinct injections", () => {
    const col = createCollector();
    setCollector(col);
    injectStyle("a", ".a { color: red; }");
    injectStyle("b", ".b { color: blue; }");
    const css = col.getCSS();
    expect(css).toContain(".a { color: red; }");
    expect(css).toContain(".b { color: blue; }");
  });

  it("collects again while a collector is active even if the element is already in the DOM", () => {
    injectStyle("x", ".x { }");
    const col = createCollector();
    setCollector(col);
    injectStyle("x", ".x { }");
    expect(col.getCSS()).toBe(".x { }");
  });

  it("clear() resets the collector", () => {
    const col = createCollector();
    setCollector(col);
    injectStyle("c", ".c { }");
    col.clear();
    expect(col.getCSS()).toBe("");
  });

  it("DOM injection resumes after setCollector(null)", () => {
    const col = createCollector();
    setCollector(col);
    injectStyle("pre", ".pre { }");
    setCollector(null);
    injectStyle("post", ".post { }");
    expect(document.head.querySelector("style[data-praxis-hash='pre']")).toBeNull();
    expect(document.head.querySelector("style[data-praxis-hash='post']")).not.toBeNull();
  });
});

// ─── STATIC_MODE ──────────────────────────────────────────────────────────────

describe("injectStyle — static mode (__PRAXIS_CSS_STATIC__)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("injectStyle is a no-op when __PRAXIS_CSS_STATIC__ is true", async () => {
    vi.stubGlobal("__PRAXIS_CSS_STATIC__", true);
    vi.resetModules();
    const { injectStyle: staticInject } = await import("../internal/registry");
    staticInject("sm1", ".a { color: red; }");
    expect(document.head.querySelector("style[data-praxis-hash='sm1']")).toBeNull();
  });
});

// ─── SSR (document === undefined) ────────────────────────────────────────────

describe("injectStyle — SSR (document undefined)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("does not throw when document is undefined", async () => {
    vi.stubGlobal("document", undefined);
    vi.resetModules();
    const { injectStyle: ssrInject } = await import("../internal/registry");
    expect(() => ssrInject("ssr1", ".a { }")).not.toThrow();
  });
});
