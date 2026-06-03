// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { keyframes } from "../builder/keyframes";
import { createCollector, setCollector } from "../internal/collector";

beforeEach(() => {
  document.head.querySelectorAll("style[data-praxis-keyframes]").forEach((el) => el.remove());
  setCollector(null);
});

afterEach(() => {
  document.head.querySelectorAll("style[data-praxis-keyframes]").forEach((el) => el.remove());
  setCollector(null);
});

describe("keyframes()", () => {
  it("injects a @keyframes style element into document.head", () => {
    keyframes("pulse", { from: { opacity: 1 }, to: { opacity: 0.4 } });
    const el = document.head.querySelector("style[data-praxis-keyframes]");
    expect(el).not.toBeNull();
    expect(el?.textContent).toContain("@keyframes prx-pulse-");
    expect(el?.textContent).toContain("from");
    expect(el?.textContent).toContain("opacity: 1;");
    expect(el?.textContent).toContain("opacity: 0.4;");
  });

  it("returns a scoped animation name prefixed with prx-<name>-", () => {
    const name = keyframes("spin", { from: { transform: "rotate(0deg)" }, to: { transform: "rotate(360deg)" } });
    expect(name).toMatch(/^prx-spin-/);
  });

  it("injects only once for identical keyframes (content-hashed)", () => {
    const stops = { from: { opacity: 1 }, to: { opacity: 0 } };
    keyframes("fade", stops);
    keyframes("fade", stops);
    expect(document.head.querySelectorAll("style[data-praxis-keyframes]").length).toBe(1);
  });

  it("returns the same scoped name for identical frames", () => {
    const stops = { from: { opacity: 0 }, to: { opacity: 1 } };
    const a = keyframes("fadeIn", stops);
    const b = keyframes("fadeIn", stops);
    expect(a).toBe(b);
  });

  it("returns different names for different frames even with same animation name", () => {
    const a = keyframes("anim", { from: { opacity: 0 }, to: { opacity: 1 } });
    const b = keyframes("anim", { from: { opacity: 1 }, to: { opacity: 0 } });
    expect(a).not.toBe(b);
  });

  it("converts camelCase frame properties to kebab-case in the output", () => {
    keyframes("slide", { from: { translateX: "0" }, to: { translateX: "100px" } } as Parameters<typeof keyframes>[1]);
    const el = document.head.querySelector("style[data-praxis-keyframes]");
    expect(el?.textContent).toContain("translate-x:");
  });

  it("supports percentage stops", () => {
    keyframes("bounce", { "0%": { transform: "scale(1)" }, "50%": { transform: "scale(1.1)" }, "100%": { transform: "scale(1)" } });
    const el = document.head.querySelector("style[data-praxis-keyframes]");
    expect(el?.textContent).toContain("0%");
    expect(el?.textContent).toContain("50%");
    expect(el?.textContent).toContain("100%");
  });
});

describe("keyframes — collector mode", () => {
  it("routes to collector when one is active (no DOM injection)", () => {
    const col = createCollector();
    setCollector(col);
    const name = keyframes("float", { from: { opacity: 0 }, to: { opacity: 1 } });
    expect(document.head.querySelector("style[data-praxis-keyframes]")).toBeNull();
    expect(col.getCSS()).toContain(`@keyframes ${name}`);
    expect(col.getCSS()).toContain("opacity: 0;");
  });

  it("deduplicates identical keyframes in the collector", () => {
    const col = createCollector();
    setCollector(col);
    const stops = { from: { opacity: 0 }, to: { opacity: 1 } };
    keyframes("same", stops);
    keyframes("same", stops);
    expect(col.getCSS().split("@keyframes").length - 1).toBe(1);
  });
});

// ─── STATIC_MODE ──────────────────────────────────────────────────────────────

describe("keyframes() — static mode (__PRAXIS_CSS_STATIC__)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("returns the scoped name without DOM injection when __PRAXIS_CSS_STATIC__ is true", async () => {
    vi.stubGlobal("__PRAXIS_CSS_STATIC__", true);
    vi.resetModules();
    const { keyframes: staticKF } = await import("../builder/keyframes");
    const name = staticKF("pulse", { from: { opacity: 1 }, to: { opacity: 0 } });
    expect(name).toMatch(/^prx-pulse-/);
    expect(document.head.querySelector("style[data-praxis-keyframes]")).toBeNull();
  });
});
