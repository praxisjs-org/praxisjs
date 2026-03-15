// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";

import { StatefulComponent } from "@praxisjs/core";

import { Persisted } from "../properties/persisted";
import { Slot, initSlots, getSlot } from "../properties/slot";

beforeEach(() => {
  localStorage.clear();
});

// Helper: creates a ClassFieldDecoratorContext mock
function fieldCtx(name: string) {
  const initializers: Array<(this: unknown) => void> = [];
  return {
    ctx: {
      name,
      kind: "field" as const,
      addInitializer(fn: (this: unknown) => void) {
        initializers.push(fn);
      },
    } as ClassFieldDecoratorContext,
    run(instance: unknown) {
      initializers.forEach((fn) => { fn.call(instance); });
    },
  };
}

// Minimal concrete component
class TestComponent extends StatefulComponent {
  render() { return null; }
}

// ── Persisted ─────────────────────────────────────────────────────────────────

describe("Persisted decorator", () => {
  it("reads back the initial value when nothing is stored", () => {
    const { ctx, run } = fieldCtx("theme");
    Persisted<string>("theme")(undefined, ctx);

    const instance = new TestComponent();
    (instance as unknown as Record<string, unknown>).theme = "light";
    run(instance);

    expect((instance as unknown as Record<string, unknown>).theme).toBe("light");
  });

  it("persists set value to localStorage", () => {
    const { ctx, run } = fieldCtx("lang");
    Persisted<string>("lang")(undefined, ctx);

    const instance = new TestComponent();
    (instance as unknown as Record<string, unknown>).lang = "en";
    run(instance);

    (instance as unknown as Record<string, unknown>).lang = "pt";
    expect(localStorage.getItem("lang")).toBe('"pt"');
    expect((instance as unknown as Record<string, unknown>).lang).toBe("pt");
  });

  it("reads existing localStorage value over the initialValue", () => {
    localStorage.setItem("color", '"red"');
    const { ctx, run } = fieldCtx("color");
    Persisted<string>("color")(undefined, ctx);

    const instance = new TestComponent();
    (instance as unknown as Record<string, unknown>).color = "blue";
    run(instance);

    expect((instance as unknown as Record<string, unknown>).color).toBe("red");
  });

  it("uses the property name as storage key when no explicit key given", () => {
    const { ctx, run } = fieldCtx("count");
    Persisted<number>()(undefined, ctx);

    const instance = new TestComponent();
    (instance as unknown as Record<string, unknown>).count = 0;
    run(instance);

    (instance as unknown as Record<string, unknown>).count = 7;
    expect(localStorage.getItem("count")).toBe("7");
  });

  it("returns separate values per instance", () => {
    const { ctx: ctxA, run: runA } = fieldCtx("val");
    Persisted<number>("valA")(undefined, ctxA);

    const { ctx: ctxB, run: runB } = fieldCtx("val");
    Persisted<number>("valB")(undefined, ctxB);

    const a = new TestComponent();
    (a as unknown as Record<string, unknown>).val = 1;
    runA(a);

    const b = new TestComponent();
    (b as unknown as Record<string, unknown>).val = 2;
    runB(b);

    (a as unknown as Record<string, unknown>).val = 10;
    (b as unknown as Record<string, unknown>).val = 20;

    expect((a as unknown as Record<string, unknown>).val).toBe(10);
    expect((b as unknown as Record<string, unknown>).val).toBe(20);
  });
});

// ── Slot ──────────────────────────────────────────────────────────────────────

describe("Slot decorator", () => {
  it("returns an empty array before initSlots is called", () => {
    const { ctx, run } = fieldCtx("default");
    Slot()(undefined, ctx);

    const instance = new TestComponent();
    run(instance);

    expect((instance as unknown as Record<string, unknown>).default).toEqual([]);
  });

  it("returns default slot children after initSlots", () => {
    const { ctx, run } = fieldCtx("default");
    Slot()(undefined, ctx);

    const instance = new TestComponent();
    run(instance);

    const el = document.createElement("span");
    initSlots(instance, [el]);

    expect((instance as unknown as Record<string, unknown>).default).toContain(el);
  });

  it("resolves named slot children", () => {
    const { ctx, run } = fieldCtx("header");
    Slot("header")(undefined, ctx);

    const instance = new TestComponent();
    run(instance);

    const el = document.createElement("div");
    el.setAttribute("slot", "header");
    initSlots(instance, [el]);

    const result = (instance as unknown as Record<string, unknown>).header as unknown[];
    expect(result).toHaveLength(1);
    expect(result[0]).toBe(el);
  });

  it("named slot element has slot attribute removed", () => {
    const { ctx, run } = fieldCtx("footer");
    Slot("footer")(undefined, ctx);

    const instance = new TestComponent();
    run(instance);

    const el = document.createElement("div");
    el.setAttribute("slot", "footer");
    initSlots(instance, [el]);

    expect(el.getAttribute("slot")).toBeNull();
  });

  it("warns when attempting to set a slot directly (dev mode)", () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "development";

    const { ctx, run } = fieldCtx("content");
    Slot("content")(undefined, ctx);

    const instance = new TestComponent();
    run(instance);

    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    (instance as unknown as Record<string, unknown>).content = ["something"];
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("[Slot]"));
    warn.mockRestore();

    process.env.NODE_ENV = originalEnv;
  });

  it("uses property name as slot name when no name given and prop is not 'default'", () => {
    const { ctx, run } = fieldCtx("sidebar");
    Slot()(undefined, ctx);

    const instance = new TestComponent();
    run(instance);

    const el = document.createElement("aside");
    el.setAttribute("slot", "sidebar");
    initSlots(instance, [el]);

    const result = (instance as unknown as Record<string, unknown>).sidebar as unknown[];
    expect(result).toHaveLength(1);
  });
});

// ── initSlots / getSlot helpers ───────────────────────────────────────────────

describe("initSlots / getSlot", () => {
  it("splits children into named and default slots", () => {
    const named = document.createElement("div");
    named.setAttribute("slot", "header");

    const plain = document.createElement("p");

    const instance = {};
    initSlots(instance, [named, plain]);

    expect(getSlot(instance, "header")).toContain(named);
    expect(getSlot(instance, "default")).toContain(plain);
  });

  it("handles null children gracefully", () => {
    const instance = {};
    initSlots(instance, null);
    expect(getSlot(instance, "default")).toEqual([]);
  });

  it("flattens nested arrays", () => {
    const a = document.createElement("span");
    const b = document.createElement("span");
    const instance = {};
    initSlots(instance, [[a, b]]);
    expect(getSlot(instance, "default")).toHaveLength(2);
  });

  it("returns empty array for unknown slot", () => {
    const instance = {};
    initSlots(instance, []);
    expect(getSlot(instance, "nonexistent")).toEqual([]);
  });
});
