// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";

import { initSlots, getSlot, Slot } from "../properties/slot";
import { StatefulComponent } from "@praxisjs/core";

// ── initSlots / getSlot ──────────────────────────────────────────────────────

describe("initSlots / getSlot", () => {
  it("returns empty default slot when children is null", () => {
    const instance = {};
    initSlots(instance, null);
    expect(getSlot(instance, "default")).toEqual([]);
  });

  it("returns empty array for unknown slot", () => {
    const instance = {};
    initSlots(instance, null);
    expect(getSlot(instance, "unknown")).toEqual([]);
  });

  it("puts plain children into the default slot", () => {
    const instance = {};
    const child = document.createElement("span");
    initSlots(instance, child);
    expect(getSlot(instance, "default")).toEqual([child]);
  });

  it("flattens array children into the default slot", () => {
    const instance = {};
    const a = document.createElement("p");
    const b = document.createElement("div");
    initSlots(instance, [a, b]);
    expect(getSlot(instance, "default")).toEqual([a, b]);
  });

  it("routes element with slot attribute to named slot", () => {
    const instance = {};
    const el = document.createElement("div");
    el.setAttribute("slot", "header");
    initSlots(instance, el);
    expect(getSlot(instance, "header")).toEqual([el]);
    expect(getSlot(instance, "default")).toEqual([]);
    // slot attribute should be removed
    expect(el.hasAttribute("slot")).toBe(false);
  });

  it("handles mixed named and default children", () => {
    const instance = {};
    const named = document.createElement("aside");
    named.setAttribute("slot", "sidebar");
    const plain = document.createElement("main");
    initSlots(instance, [named, plain]);
    expect(getSlot(instance, "sidebar")).toEqual([named]);
    expect(getSlot(instance, "default")).toEqual([plain]);
  });

  it("skips null children in array", () => {
    const instance = {};
    const el = document.createElement("span");
    initSlots(instance, [null, el, undefined]);
    expect(getSlot(instance, "default")).toEqual([el]);
  });
});

// ── Slot decorator ───────────────────────────────────────────────────────────

describe("Slot decorator", () => {
  it("provides the default slot via field decorator", () => {
    class MyComp extends StatefulComponent {
      render() { return null; }
    }

    const initializers: Array<(this: unknown) => void> = [];
    const ctx = {
      name: "default",
      kind: "field" as const,
      addInitializer(fn: (this: unknown) => void) { initializers.push(fn); },
    } as ClassFieldDecoratorContext<StatefulComponent>;

    Slot()(undefined, ctx);

    const instance = new MyComp() as unknown as Record<string, unknown>;
    initializers.forEach((fn) => { fn.call(instance); });

    // No children initialized — slot should be empty
    const children = document.createElement("p");
    initSlots(instance as object, children);

    expect(Array.isArray((instance as Record<string, unknown>).default)).toBe(true);
  });

  it("uses custom slot name when provided", () => {
    class MyComp extends StatefulComponent {
      render() { return null; }
    }

    const initializers: Array<(this: unknown) => void> = [];
    const ctx = {
      name: "content",
      kind: "field" as const,
      addInitializer(fn: (this: unknown) => void) { initializers.push(fn); },
    } as ClassFieldDecoratorContext<StatefulComponent>;

    Slot("header")(undefined, ctx);

    const instance = new MyComp() as unknown as Record<string, unknown>;
    initializers.forEach((fn) => { fn.call(instance); });

    const el = document.createElement("nav");
    el.setAttribute("slot", "header");
    initSlots(instance as object, el);

    const slot = (instance as Record<string, unknown>).content as unknown[];
    expect(slot).toHaveLength(1);
    expect(slot[0]).toBe(el);
  });

  it("warns on direct assignment in non-production", () => {
    class MyComp extends StatefulComponent {
      render() { return null; }
    }

    const initializers: Array<(this: unknown) => void> = [];
    const ctx = {
      name: "default",
      kind: "field" as const,
      addInitializer(fn: (this: unknown) => void) { initializers.push(fn); },
    } as ClassFieldDecoratorContext<StatefulComponent>;

    Slot()(undefined, ctx);

    const instance = new MyComp() as unknown as Record<string, unknown>;
    initializers.forEach((fn) => { fn.call(instance); });

    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    (instance as Record<string, unknown>).default = "bad";
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("[Slot]"));
    warn.mockRestore();
  });
});
