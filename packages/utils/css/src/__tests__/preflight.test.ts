// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// The preflight CSS is a fixed string, so globalStyle's module-level injected Set
// remembers it across tests. Reset modules in beforeEach to get a fresh Set each time.

function cleanup() {
  document.head.querySelectorAll("style[data-praxis-global]").forEach((el) => el.remove());
}

beforeEach(() => {
  vi.resetModules();
  cleanup();
});

afterEach(() => {
  cleanup();
  vi.resetModules();
});

describe("preflight()", () => {
  it("injects a style element into document.head", async () => {
    const { preflight } = await import("../preflight.js");
    preflight();
    expect(document.head.querySelector("style[data-praxis-global]")).not.toBeNull();
  });

  it("contains core reset rules", async () => {
    const { preflight } = await import("../preflight.js");
    preflight();
    const css = document.head.querySelector("style[data-praxis-global]")?.textContent ?? "";
    expect(css).toContain("box-sizing: border-box");
    expect(css).toContain("margin: 0");
    expect(css).toContain("padding: 0");
  });

  it("uses standard font stacks without --theme() references", async () => {
    const { preflight } = await import("../preflight.js");
    preflight();
    const css = document.head.querySelector("style[data-praxis-global]")?.textContent ?? "";
    expect(css).toContain("ui-sans-serif");
    expect(css).toContain("ui-monospace");
    expect(css).not.toContain("--theme(");
  });

  it("is idempotent — calling twice injects only once", async () => {
    const { preflight } = await import("../preflight.js");
    preflight();
    preflight();
    expect(document.head.querySelectorAll("style[data-praxis-global]").length).toBe(1);
  });

  it("routes through the collector when one is active", async () => {
    const { setCollector, createCollector } = await import("../internal/collector.js");
    const { preflight } = await import("../preflight.js");
    const col = createCollector();
    setCollector(col);
    preflight();
    setCollector(null);
    expect(document.head.querySelector("style[data-praxis-global]")).toBeNull();
    expect(col.getCSS()).toContain("box-sizing: border-box");
  });

  it("wraps the reset in `@layer reset` by default", async () => {
    const { preflight } = await import("../preflight.js");
    preflight();
    const css = document.head.querySelector("style[data-praxis-global]")?.textContent ?? "";
    expect(css).toContain("@layer reset {");
    expect(css).toContain("box-sizing: border-box");
  });

  it("wraps the reset in a custom named layer", async () => {
    const { preflight } = await import("../preflight.js");
    preflight({ layer: "tailwind-base" });
    const css = document.head.querySelector("style[data-praxis-global]")?.textContent ?? "";
    expect(css).toContain("@layer tailwind-base {");
  });

  it("injects un-layered CSS when layer: false", async () => {
    const { preflight } = await import("../preflight.js");
    preflight({ layer: false });
    const css = document.head.querySelector("style[data-praxis-global]")?.textContent ?? "";
    expect(css).not.toContain("@layer");
  });
});
