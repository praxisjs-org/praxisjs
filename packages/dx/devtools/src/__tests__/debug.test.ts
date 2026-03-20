import { beforeEach, describe, it, expect, vi } from "vitest";

import { computed, signal } from "@praxisjs/core/internal";

import { Registry } from "../core/registry";
import { Debug } from "../decorators/debug";

beforeEach(() => {
  (Registry as unknown as { _instance: Registry | null })._instance = null;
});

// ── Method decorator ──────────────────────────────────────────────────────────

describe("Debug — method decorator", () => {
  it("records a method:call timeline entry", () => {
    const ctx = { kind: "method" as const, name: "doWork" } as ClassMethodDecoratorContext;
    const original = vi.fn((_x: unknown) => "result");

    const wrapped = Debug()(original as never, ctx) as (...args: unknown[]) => unknown;

    class Comp { constructor() {} }
    const instance = new Comp();
    const registry = Registry.instance;
    registry.registerComponent(instance, "Comp");

    wrapped.call(instance, 42);

    const entry = registry.getTimeline().find((t) => t.type === "method:call");
    expect(entry).toBeDefined();
    expect(entry?.label).toContain("doWork");
    expect(entry?.data.args).toEqual([42]);
    expect(entry?.data.result).toBe("result");
  });

  it("records throw result when method throws", () => {
    const ctx = { kind: "method" as const, name: "boom" } as ClassMethodDecoratorContext;
    const original = () => { throw new Error("fail"); };

    const wrapped = Debug()(original as never, ctx) as () => void;

    class Comp {}
    const instance = new Comp();
    Registry.instance.registerComponent(instance, "Comp");

    expect(() => wrapped.call(instance)).toThrow("fail");

    const entry = Registry.instance.getTimeline().find((t) => t.type === "method:call");
    expect(entry?.data.result).toContain("throw");
  });

  it("uses custom label from options", () => {
    const ctx = { kind: "method" as const, name: "internal" } as ClassMethodDecoratorContext;
    const original = vi.fn(() => undefined);

    const wrapped = Debug({ label: "myLabel" })(original as never, ctx) as () => void;

    class Comp {}
    const instance = new Comp();
    Registry.instance.registerComponent(instance, "Comp");
    wrapped.call(instance);

    const entry = Registry.instance.getTimeline().find((t) => t.type === "method:call");
    expect(entry?.label).toContain("myLabel");
  });
});

// ── Field decorator (wrapping @State getter/setter) ───────────────────────────

describe("Debug — field decorator wrapping @State", () => {
  it("registers signal and tracks updates", () => {
    const registry = Registry.instance;
    const instance = { count: 0 } as Record<string, unknown>;

    // Simulate what @State() does: install a getter/setter on the instance
    const s = signal(0);
    Object.defineProperty(instance, "count", {
      get() { return s(); },
      set(v: number) { s.set(v); },
      enumerable: true,
      configurable: true,
    });

    const initializers: Array<(this: unknown) => void> = [];
    const ctx = {
      kind: "field" as const,
      name: "count",
      addInitializer(fn: (this: unknown) => void) { initializers.push(fn); },
    } as ClassFieldDecoratorContext;

    Debug()(undefined, ctx);
    initializers.forEach((fn) => fn.call(instance));

    const signals = registry.getSignals();
    expect(signals.length).toBeGreaterThan(0);
    expect(signals[0].label).toBe("count");
    expect(signals[0].value).toBe(0);

    // Read the property through the getter (covers the get() function body)
    const readValue = (instance as Record<string, unknown>).count;
    expect(readValue).toBe(0);

    // Trigger update through the wrapped setter
    (instance as Record<string, unknown>).count = 10;

    // The set through the defined property calls updateSignal
    expect(registry.getSignals()[0].value).toBe(10);
  });
});

// ── Field decorator (computed field) ─────────────────────────────────────────

describe("Debug — field decorator with computed value", () => {
  it("registers computed signal and tracks updates", () => {
    const registry = Registry.instance;
    const src = signal(1);
    const c = computed(() => src() * 2);

    const instance = { doubled: c } as Record<string, unknown>;

    const initializers: Array<(this: unknown) => void> = [];
    const ctx = {
      kind: "field" as const,
      name: "doubled",
      addInitializer(fn: (this: unknown) => void) { initializers.push(fn); },
    } as ClassFieldDecoratorContext;

    Debug()(undefined, ctx);
    initializers.forEach((fn) => fn.call(instance));

    const signals = registry.getSignals();
    expect(signals.length).toBeGreaterThan(0);
    expect(signals[0].label).toBe("doubled");
    expect(signals[0].value).toBe(2);

    src.set(5);
    expect(registry.getSignals()[0].value).toBe(10);
  });

  it("warns when field value is not a computed and not undefined", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const instance = { myField: "not-computed" } as Record<string, unknown>;

    const initializers: Array<(this: unknown) => void> = [];
    const ctx = {
      kind: "field" as const,
      name: "myField",
      addInitializer(fn: (this: unknown) => void) { initializers.push(fn); },
    } as ClassFieldDecoratorContext;

    Debug()(undefined, ctx);
    initializers.forEach((fn) => fn.call(instance));

    expect(warn).toHaveBeenCalledWith(expect.stringContaining("[PraxisJS DevTools]"));
    warn.mockRestore();
  });

  it("warns when computed field is replaced with non-computed value via setter", () => {
    const registry = Registry.instance;
    const src = signal(1);
    const c = computed(() => src() * 2);

    const instance = { doubled: c } as Record<string, unknown>;

    const initializers: Array<(this: unknown) => void> = [];
    const ctx = {
      kind: "field" as const,
      name: "doubled",
      addInitializer(fn: (this: unknown) => void) { initializers.push(fn); },
    } as ClassFieldDecoratorContext;

    Debug()(undefined, ctx);
    initializers.forEach((fn) => fn.call(instance));

    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    // Set a non-computed value through the property setter
    (instance as Record<string, unknown>).doubled = "not-a-computed";
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("[PraxisJS DevTools]"));
    warn.mockRestore();

    void registry;
  });

  it("updates slot when computed field is replaced with a new computed", () => {
    const registry = Registry.instance;
    const src = signal(1);
    const c1 = computed(() => src() * 2);
    const c2 = computed(() => src() * 10);

    const instance = { doubled: c1 } as Record<string, unknown>;

    const initializers: Array<(this: unknown) => void> = [];
    const ctx = {
      kind: "field" as const,
      name: "doubled",
      addInitializer(fn: (this: unknown) => void) { initializers.push(fn); },
    } as ClassFieldDecoratorContext;

    Debug()(undefined, ctx);
    initializers.forEach((fn) => fn.call(instance));

    // Replace with new computed
    (instance as Record<string, unknown>).doubled = c2;

    // The getter should now return c2
    const newComputed = (instance as Record<string, unknown>).doubled;
    expect(typeof newComputed).toBe("function");

    void registry;
  });

  it("does not warn when field value is undefined", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const instance = { myUndef: undefined } as Record<string, unknown>;

    const initializers: Array<(this: unknown) => void> = [];
    const ctx = {
      kind: "field" as const,
      name: "myUndef",
      addInitializer(fn: (this: unknown) => void) { initializers.push(fn); },
    } as ClassFieldDecoratorContext;

    Debug()(undefined, ctx);
    initializers.forEach((fn) => fn.call(instance));

    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });
});

// ── Getter decorator ──────────────────────────────────────────────────────────

describe("Debug — getter decorator", () => {
  it("returns undefined (void) for getter kind", async () => {
    const initializers: Array<(this: unknown) => void> = [];
    const ctx = {
      kind: "getter" as const,
      name: "myGetter",
      addInitializer(fn: (this: unknown) => void) { initializers.push(fn); },
    } as ClassGetterDecoratorContext;

    const src = signal(3);
    const result = Debug()(() => src() * 2 as unknown as never, ctx);
    expect(result).toBeUndefined();

    // Run the initializer on a fake instance
    const instance = { myGetter: computed(() => src() * 2) };
    initializers.forEach((fn) => fn.call(instance));

    // Wait for queueMicrotask
    await new Promise<void>((r) => setTimeout(r, 0));

    const signals = Registry.instance.getSignals();
    expect(signals.length).toBeGreaterThan(0);

    // Update src to trigger the subscribe callback (covers the updateSignal path)
    const signalsBefore = Registry.instance.getSignals()[0]?.value;
    src.set(10);
    // The computed updates: src() * 2 = 20
    await new Promise<void>((r) => setTimeout(r, 0));
    expect(signalsBefore).toBe(6); // 3 * 2 = 6
  });
});
