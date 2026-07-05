// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { globalStyle } from "../global";
import { createCollector, setCollector } from "../internal/collector";

let seed = 0;
// Injects a unique comment so the content hash differs per test call.
function unique(css: string): string {
  return css.replace("{", `/* t${++seed} */ {`);
}

beforeEach(() => {
  document.head.querySelectorAll("style[data-praxis-global]").forEach((el) => el.remove());
  setCollector(null);
});

afterEach(() => {
  document.head.querySelectorAll("style[data-praxis-global]").forEach((el) => el.remove());
  setCollector(null);
});

describe("globalStyle()", () => {
  it("injects an unscoped style element into document.head", () => {
    globalStyle(_css => unique("body { margin: 0; }"));
    const el = document.head.querySelector("style[data-praxis-global]");
    expect(el).not.toBeNull();
    expect(el?.textContent).toContain("margin: 0;");
  });

  it("is idempotent — injects the same CSS only once", () => {
    const css = unique("*, *::before, *::after { box-sizing: border-box; }");
    globalStyle(_css => css);
    globalStyle(_css => css);
    expect(document.head.querySelectorAll("style[data-praxis-global]").length).toBe(1);
  });

  it("injects separate elements for distinct CSS strings", () => {
    globalStyle(_css => unique("body { margin: 0; }"));
    globalStyle(_css => unique("html { font-size: 16px; }"));
    expect(document.head.querySelectorAll("style[data-praxis-global]").length).toBe(2);
  });

  it("routes to the collector when one is active", () => {
    const col = createCollector();
    setCollector(col);
    globalStyle(_css => unique("body { margin: 0; }"));
    expect(document.head.querySelector("style[data-praxis-global]")).toBeNull();
    expect(col.getCSS()).toContain("margin: 0;");
  });

  it("deduplicates in the collector", () => {
    const col = createCollector();
    setCollector(col);
    const css = unique("*, *::before, *::after { box-sizing: border-box; }");
    globalStyle(_css => css);
    globalStyle(_css => css);
    expect(col.getCSS().split("box-sizing").length - 1).toBe(1);
  });
});

// ─── Factory — builder form ───────────────────────────────────────────────────

describe("globalStyle() — factory with builder", () => {
  it("factory receives css (= createCSSBuilder) and uses the fluent builder", () => {
    globalStyle(css =>
      css({})
        .on(unique("body { }").replace(" { }", ""), { margin: 0, fontFamily: "system-ui" })
    );
    const content = document.head.querySelector("style[data-praxis-global]")?.textContent ?? "";
    expect(content).toContain("font-family: system-ui");
    expect(content).toContain("margin: 0");
  });

  it("chains multiple .on() calls to produce multiple selectors in one injection", () => {
    // Use unique values inside properties so the overall CSS hash is unique per test
    const lh = `1.${seed + 1}`;
    globalStyle(css =>
      css({})
        .on(unique("* { }").replace(" { }", ""), { boxSizing: "border-box" })
        .on("html", { lineHeight: lh })
    );
    const content = document.head.querySelector("style[data-praxis-global]")?.textContent ?? "";
    expect(content).toContain("box-sizing: border-box");
    expect(content).toContain("line-height:");
  });

  it("factory returning a raw string is accepted", () => {
    const css = unique("button { cursor: pointer; }");
    globalStyle(_css => css);
    expect(document.head.querySelector("style[data-praxis-global]")?.textContent).toContain("cursor: pointer");
  });

  it("deduplicates when factory produces the same CSS twice", () => {
    const css = unique("a { color: inherit; }");
    globalStyle(_css => css);
    globalStyle(_css => css);
    expect(document.head.querySelectorAll("style[data-praxis-global]").length).toBe(1);
  });

  it("routes through the collector when one is active", () => {
    const col = createCollector();
    setCollector(col);
    globalStyle(_css => unique("a { text-decoration: none; }"));
    expect(document.head.querySelector("style[data-praxis-global]")).toBeNull();
    expect(col.getCSS()).toContain("text-decoration: none");
  });
});

// ─── layer option ─────────────────────────────────────────────────────────────

describe("globalStyle() — layer option", () => {
  it("injects un-layered CSS by default", () => {
    globalStyle(_css => unique("body { margin: 0; }"));
    const content = document.head.querySelector("style[data-praxis-global]")?.textContent ?? "";
    expect(content).not.toContain("@layer");
  });

  it("wraps the CSS in a named @layer when provided", () => {
    globalStyle(_css => unique("body { margin: 0; }"), { layer: "base" });
    const content = document.head.querySelector("style[data-praxis-global]")?.textContent ?? "";
    expect(content).toContain("@layer base {");
    expect(content).toContain("margin: 0;");
  });

  it("does not wrap in a layer when layer: false", () => {
    globalStyle(_css => unique("body { margin: 0; }"), { layer: false });
    const content = document.head.querySelector("style[data-praxis-global]")?.textContent ?? "";
    expect(content).not.toContain("@layer");
  });
});

// ─── STATIC_MODE ──────────────────────────────────────────────────────────────

describe("globalStyle() — static mode (__PRAXIS_CSS_STATIC__)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("skips DOM injection when __PRAXIS_CSS_STATIC__ is true", async () => {
    vi.stubGlobal("__PRAXIS_CSS_STATIC__", true);
    vi.resetModules();
    const { globalStyle: staticGS } = await import("../global");
    staticGS(_css => unique("body { margin: 0; }"));
    expect(document.head.querySelector("style[data-praxis-global]")).toBeNull();
  });
});

// ─── SSR (document === undefined) ────────────────────────────────────────────

describe("globalStyle() — SSR (document undefined)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("does not throw when document is undefined", async () => {
    vi.stubGlobal("document", undefined);
    vi.resetModules();
    const { globalStyle: ssrGS } = await import("../global");
    expect(() => ssrGS(_css => unique("p { color: red; }"))).not.toThrow();
  });
});
