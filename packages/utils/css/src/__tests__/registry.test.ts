// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { injectStyle, releaseStyle } from "../internal/registry";
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

describe("injectStyle / releaseStyle", () => {
  it("injects a style element with the given key and css", () => {
    injectStyle("abc", ".a { color: red; }");
    const el = document.head.querySelector("style[data-praxis-hash='abc']");
    expect(el).not.toBeNull();
    expect(el?.textContent).toBe(".a { color: red; }");
  });

  it("reference-counts — increments count on duplicate key", () => {
    injectStyle("k1", ".x { display: flex; }");
    injectStyle("k1", ".x { display: flex; }");
    expect(document.head.querySelectorAll("style[data-praxis-hash='k1']").length).toBe(1);
  });

  it("removes the element when count reaches zero", () => {
    injectStyle("k2", ".y { opacity: 1; }");
    injectStyle("k2", ".y { opacity: 1; }");
    releaseStyle("k2");
    expect(document.head.querySelector("style[data-praxis-hash='k2']")).not.toBeNull();
    releaseStyle("k2");
    expect(document.head.querySelector("style[data-praxis-hash='k2']")).toBeNull();
  });

  it("releaseStyle on non-existent key is a no-op", () => {
    expect(() => releaseStyle("does-not-exist")).not.toThrow();
  });

  it("re-injects when element was removed externally (DOM divergence guard)", () => {
    injectStyle("k3", ".z { color: blue; }");
    document.head.querySelector("style[data-praxis-hash='k3']")?.remove();
    injectStyle("k3", ".z { color: blue; }");
    expect(document.head.querySelector("style[data-praxis-hash='k3']")).not.toBeNull();
    releaseStyle("k3");
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

  it("releaseStyle is a no-op when a collector is active", () => {
    const col = createCollector();
    setCollector(col);
    injectStyle("x", ".x { }");
    expect(() => releaseStyle("x")).not.toThrow();
    expect(col.getCSS()).toContain(".x { }");
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
    releaseStyle("post");
  });
});

// ─── STATIC_MODE ──────────────────────────────────────────────────────────────

describe("injectStyle / releaseStyle — static mode (__PRAXIS_CSS_STATIC__)", () => {
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

  it("releaseStyle is a no-op when __PRAXIS_CSS_STATIC__ is true", async () => {
    vi.stubGlobal("__PRAXIS_CSS_STATIC__", true);
    vi.resetModules();
    const { releaseStyle: staticRelease } = await import("../internal/registry");
    expect(() => staticRelease("sm2")).not.toThrow();
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
