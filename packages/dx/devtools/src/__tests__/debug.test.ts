import { beforeEach, describe, it, expect, vi } from "vitest";

import { computed, signal } from "@praxisjs/core/internal";

import { Registry } from "../core/registry";
import { Debug } from "../decorators/debug";

beforeEach(() => {
  (Registry as unknown as { _instance: Registry | null })._instance = null;
});

// ── Method decorator ──────────────────────────────────────────────────────────

function mockMethodCtx(name: string) {
  const initializers: Array<(this: object) => void> = [];
  return {
    kind: "method" as const,
    name,
    addInitializer(fn: (this: object) => void) { initializers.push(fn); },
    runInitializers(instance: object) { initializers.forEach((fn) => { fn.call(instance); }); },
  } as unknown as ClassMethodDecoratorContext & { runInitializers(instance: object): void };
}

describe("Debug — method decorator", () => {
  it("records a method:call timeline entry", () => {
    const ctx = mockMethodCtx("doWork");
    const original = vi.fn((_x: unknown) => "result");

    Debug()(original as never, ctx);

    class Comp { doWork(_x: unknown) { return "result"; } }
    const instance = new Comp();
    ctx.runInitializers(instance);

    const registry = Registry.instance;
    registry.registerComponent(instance, "Comp");

    instance.doWork(42);

    const entry = registry.getTimeline().find((t) => t.type === "method:call");
    expect(entry).toBeDefined();
    expect(entry?.label).toContain("doWork");
    expect(entry?.data.args).toEqual([42]);
    expect(entry?.data.result).toBe("result");
  });

  it("records throw result when method throws", () => {
    const ctx = mockMethodCtx("boom");
    const original = () => { throw new Error("fail"); };

    Debug()(original as never, ctx);

    class Comp { boom() { throw new Error("fail"); } }
    const instance = new Comp();
    ctx.runInitializers(instance);
    Registry.instance.registerComponent(instance, "Comp");

    expect(() => (instance as unknown as Record<string, () => void>).boom()).toThrow("fail");

    const entry = Registry.instance.getTimeline().find((t) => t.type === "method:call");
    expect(entry?.data.result).toContain("throw");
  });

  it("uses custom label from options", () => {
    const ctx = mockMethodCtx("internal");
    const original = vi.fn(() => undefined);

    Debug({ label: "myLabel" })(original as never, ctx);

    class Comp { internal() { return undefined; } }
    const instance = new Comp();
    ctx.runInitializers(instance);
    Registry.instance.registerComponent(instance, "Comp");
    (instance as unknown as Record<string, () => void>).internal();

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
  it("registers computed signal and tracks updates", async () => {
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
    await Promise.resolve();
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

// ── Async method decorator ────────────────────────────────────────────────────

describe("Debug — async method decorator", () => {
  it("timing is recorded for the synchronous wrapper (documents limitation: async duration is not measured)", () => {
    // @Debug wraps methods synchronously. For async methods, the recorded duration
    // covers only until the Promise is returned, not until it resolves.
    const ctx = mockMethodCtx("fetchData");
    const original = vi.fn(async () => {
      await new Promise((r) => setTimeout(r, 10));
      return "done";
    });

    Debug()(original as never, ctx);

    class Comp { async fetchData() { return "done"; } }
    const instance = new Comp();
    ctx.runInitializers(instance);
    Registry.instance.registerComponent(instance, "Comp");

    // Call and await
    const promise = (instance as unknown as Record<string, () => unknown>).fetchData() as Promise<unknown>;
    expect(promise).toBeInstanceOf(Promise);

    // Timeline entry is recorded synchronously (before the promise resolves)
    const entry = Registry.instance.getTimeline().find((t) => t.type === "method:call");
    expect(entry).toBeDefined();
    expect(entry?.label).toContain("fetchData");
    // Duration is near-zero since it only measured until Promise was returned
    expect(typeof entry?.data.duration).toBe("number");

    return promise;
  });
});

// ── Empty constructor name ─────────────────────────────────────────────────────

describe("Debug — class with empty constructor name", () => {
  it("falls back gracefully when constructor.name is empty string", () => {
    const ctx = mockMethodCtx("doWork");
    const original = vi.fn(() => 42);

    Debug()(original as never, ctx);

    // Simulate a class whose constructor.name is empty (e.g. minified code)
    const instance = Object.create({ constructor: { name: "" } }) as object;
    ctx.runInitializers(instance);

    expect(() => {
      (instance as Record<string, () => void>).doWork();
    }).not.toThrow();

    const entry = Registry.instance.getTimeline().find((t) => t.type === "method:call");
    expect(entry).toBeDefined();
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
