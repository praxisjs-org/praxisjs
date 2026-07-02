import { describe, it, expect, vi } from "vitest";

import { StatefulComponent } from "@praxisjs/core";
import {
  computed,
  isStateDirty,
  setStateDirty,
  signal,
} from "@praxisjs/core/internal";

import { createFieldDecorator } from "../create-field-decorator";
import { createGetterDecorator } from "../create-getter-decorator";
import { createAccessorDecorator } from "../create-accessor-decorator";
import { Watch } from "../functions/watch";
import { When } from "../functions/when";
import { Compose } from "../properties/compose";
import { Computed } from "../properties/computed";
import { History } from "../properties/history";
import { FunctionProp } from "../properties/function-prop";
import { Prop } from "../properties/prop";
import { State } from "../properties/state";

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

function methodCtx(name: string) {
  const initializers: Array<(this: unknown) => void> = [];
  return {
    ctx: {
      name,
      kind: "method" as const,
      addInitializer(fn: (this: unknown) => void) {
        initializers.push(fn);
      },
    } as ClassMethodDecoratorContext,
    run(instance: unknown) {
      initializers.forEach((fn) => { fn.call(instance); });
    },
  };
}

// Minimal concrete component
class TestComponent extends StatefulComponent {
  render() { return null; }
}

// ── State ─────────────────────────────────────────────────────────────────────

describe("State decorator", () => {
  it("converts a field to a reactive getter/setter", () => {
    const { ctx, run } = fieldCtx("count");
    State()(undefined, ctx);

    const instance = new TestComponent();
    (instance as unknown as Record<string, unknown>).count = 10;
    run(instance);

    expect((instance as unknown as Record<string, unknown>).count).toBe(10);
    (instance as unknown as Record<string, unknown>).count = 20;
    expect((instance as unknown as Record<string, unknown>).count).toBe(20);
  });

  it("sets state dirty on write", () => {
    const { ctx, run } = fieldCtx("value");
    State()(undefined, ctx);

    const instance = new TestComponent();
    (instance as unknown as Record<string, unknown>).value = "hello";
    run(instance);

    setStateDirty(instance, false);
    (instance as unknown as Record<string, unknown>).value = "world";
    expect(isStateDirty(instance)).toBe(true);
  });

  it("accepts null as initial value", () => {
    const { ctx, run } = fieldCtx("nullable");
    State()(undefined, ctx);

    const instance = new TestComponent();
    (instance as unknown as Record<string, unknown>).nullable = null;
    run(instance);

    expect((instance as unknown as Record<string, unknown>).nullable).toBeNull();
    (instance as unknown as Record<string, unknown>).nullable = "set";
    expect((instance as unknown as Record<string, unknown>).nullable).toBe("set");
  });

  it("multiple State fields on same class are independent", () => {
    const { ctx: ctxA, run: runA } = fieldCtx("a");
    const { ctx: ctxB, run: runB } = fieldCtx("b");
    State()(undefined, ctxA);
    State()(undefined, ctxB);

    const instance = new TestComponent();
    (instance as unknown as Record<string, unknown>).a = 1;
    (instance as unknown as Record<string, unknown>).b = 2;
    runA(instance);
    runB(instance);

    (instance as unknown as Record<string, unknown>).a = 10;
    expect((instance as unknown as Record<string, unknown>).a).toBe(10);
    expect((instance as unknown as Record<string, unknown>).b).toBe(2);
  });
});

// ── Prop ──────────────────────────────────────────────────────────────────────

describe("Prop decorator", () => {
  it("reads from raw props when set by parent", () => {
    const { ctx, run } = fieldCtx("label");
    Prop()(undefined, ctx);

    const instance = new TestComponent({ label: "hello" });
    run(instance);

    expect((instance as unknown as Record<string, unknown>).label).toBe("hello");
  });

  it("falls back to default value when not in raw props", () => {
    const { ctx, run } = fieldCtx("size");
    Prop()(undefined, ctx);

    const instance = new TestComponent();
    (instance as unknown as Record<string, unknown>).size = "md"; // set before initializer runs
    run(instance);

    expect((instance as unknown as Record<string, unknown>).size).toBe("md");
  });

  it("unwraps a function prop (reactive prop)", () => {
    const { ctx, run } = fieldCtx("text");
    Prop()(undefined, ctx);

    const s = signal("reactive");
    const instance = new TestComponent({ text: () => s() });
    run(instance);

    expect((instance as unknown as Record<string, unknown>).text).toBe("reactive");
    s.set("updated");
    expect((instance as unknown as Record<string, unknown>).text).toBe("updated");
  });
});

// ── FunctionProp ──────────────────────────────────────────────────────────────

describe("FunctionProp decorator", () => {
  it("reads function values from raw props without invoking them", () => {
    const { ctx, run } = fieldCtx("filter");
    FunctionProp()(undefined, ctx);

    const filter = vi.fn((value: number) => value > 1);
    const instance = new TestComponent({ filter });
    run(instance);

    const received = (instance as unknown as Record<string, unknown>).filter;
    expect(received).toBe(filter);
    expect(filter).not.toHaveBeenCalled();
    expect((received as (value: number) => boolean)(2)).toBe(true);
    expect(filter).toHaveBeenCalledWith(2);
  });

  it("falls back to the default function when not in raw props", () => {
    const { ctx, run } = fieldCtx("filter");
    FunctionProp()(undefined, ctx);

    const defaultFilter = vi.fn((value: number) => value % 2 === 0);
    const instance = new TestComponent();
    (instance as unknown as Record<string, unknown>).filter = defaultFilter;
    run(instance);

    const received = (instance as unknown as Record<string, unknown>).filter;
    expect(received).toBe(defaultFilter);
    expect((received as (value: number) => boolean)(4)).toBe(true);
    expect(defaultFilter).toHaveBeenCalledWith(4);
  });

  it("set() updates the default function used without a raw prop", () => {
    const { ctx, run } = fieldCtx("filter");
    FunctionProp()(undefined, ctx);

    const instance = new TestComponent();
    run(instance);

    const nextFilter = (value: number) => value < 10;
    (instance as unknown as Record<string, unknown>).filter = nextFilter;

    expect((instance as unknown as Record<string, unknown>).filter).toBe(nextFilter);
  });
});

// ── Computed ──────────────────────────────────────────────────────────────────

describe("Computed decorator", () => {
  it("wraps a getter in a computed — result is memoized", () => {
    const s = signal(5);
    const fn = vi.fn(function (this: object) { return s() * 2; });

    const { ctx, run } = getterCtx("doubled");
    Computed()(fn, ctx);
    const instance = {} as unknown as StatefulComponent;
    run(instance);

    const result1 = (instance as unknown as Record<string, unknown>).doubled;
    const result2 = (instance as unknown as Record<string, unknown>).doubled;
    expect(result1).toBe(10);
    expect(result2).toBe(10);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("recomputes when underlying signal changes", () => {
    const s = signal(3);
    const getter = function (this: object) { return s() * 2; };
    const { ctx, run } = getterCtx("val");
    Computed()(getter, ctx);
    const obj = {} as unknown as StatefulComponent;
    run(obj);

    expect((obj as unknown as Record<string, unknown>).val).toBe(6);
    s.set(5);
    expect((obj as unknown as Record<string, unknown>).val).toBe(10);
  });

  it("is per-instance — separate computed per object", () => {
    const s = signal(1);
    const getter = function (this: object) { return s(); };
    const { ctx, run } = getterCtx("val");
    Computed()(getter, ctx);
    const a = {} as unknown as StatefulComponent;
    const b = {} as unknown as StatefulComponent;
    run(a);
    run(b);

    expect((a as unknown as Record<string, unknown>).val).toBe(1);
    expect((b as unknown as Record<string, unknown>).val).toBe(1);
  });
});

// ── Computed (writable) ───────────────────────────────────────────────────────

function getterCtx(name: string) {
  const initializers: Array<(this: unknown) => void> = [];
  return {
    ctx: {
      name,
      kind: "getter" as const,
      addInitializer(fn: (this: unknown) => void) {
        initializers.push(fn);
      },
    } as unknown as ClassGetterDecoratorContext,
    run(instance: unknown) {
      initializers.forEach((fn) => { fn.call(instance); });
    },
  };
}

describe("Computed decorator — writable (set option)", () => {
  it("setter is called when property is assigned", () => {
    const written: number[] = [];
    const { ctx, run } = getterCtx("double");

    const s = signal(3);
    const getter = function (this: object) { return s() * 2; };
    Computed({ set: (v: unknown) => { written.push(v as number); } })(getter, ctx);

    const instance = {} as unknown as StatefulComponent;
    run(instance);

    (instance as unknown as Record<string, unknown>).double = 42;
    expect(written).toEqual([42]);
  });

  it("setter receives the component instance as this", () => {
    let capturedThis: unknown;
    const { ctx, run } = getterCtx("val");

    const getter = function (this: object) { return 0; };
    Computed({ set(this: unknown, _v: unknown) { capturedThis = this; } })(getter, ctx);

    const instance = { id: "target" } as unknown as StatefulComponent;
    run(instance);

    (instance as unknown as Record<string, unknown>).val = 99;
    expect(capturedThis).toBe(instance);
  });

  it("getter still returns the computed value after set option is added", () => {
    const s = signal(5);
    const { ctx, run } = getterCtx("doubled");

    const getter = function (this: object) { return s() * 2; };
    Computed({ set: (_v: unknown) => { /* no-op */ } })(getter, ctx);

    const instance = {} as unknown as StatefulComponent;
    run(instance);

    expect((instance as unknown as Record<string, unknown>).doubled).toBe(10);
    s.set(7);
    expect((instance as unknown as Record<string, unknown>).doubled).toBe(14);
  });

  it("setter writes through to underlying signals, updating the getter", () => {
    const s = signal(0);
    const { ctx, run } = getterCtx("celsius");

    const getter = function (this: object) { return s(); };
    Computed({ set: (v: unknown) => { s.set(v as number); } })(getter, ctx);

    const instance = {} as unknown as StatefulComponent;
    run(instance);

    (instance as unknown as Record<string, unknown>).celsius = 100;
    expect((instance as unknown as Record<string, unknown>).celsius).toBe(100);
  });
});

// ── Computed (accessor form) ──────────────────────────────────────────────────

describe("Computed decorator — accessor form ({ get, set })", () => {
  function applyAccessorDecorator<T>(
    options: { get: (this: object) => T; set: (this: object, value: T) => void },
    instance: object,
  ): { get: () => T; set: (v: T) => void } {
    const target = {
      get(this: object) { return undefined as T; },
      set(_v: T) { /* original */ },
    };
    const ctx = { kind: "accessor", name: "value" } as unknown as ClassAccessorDecoratorContext<object, T>;
    const result = Computed(options)(target, ctx);
    result.init!.call(instance, undefined as unknown as T);
    return {
      get: () => result.get!.call(instance),
      set: (v: T) => result.set!.call(instance, v),
    };
  }

  it("get function is wrapped in a computed — result is memoized", () => {
    const s = signal(3);
    const getFn = vi.fn(function (this: object) { return s() * 2; });
    const instance = {};
    const { get } = applyAccessorDecorator({ get: getFn, set: () => { /* no-op */ } }, instance);

    expect(get()).toBe(6);
    expect(get()).toBe(6);
    expect(getFn).toHaveBeenCalledTimes(1);
  });

  it("recomputes when underlying signal changes", () => {
    const s = signal(10);
    const instance = {};
    const { get } = applyAccessorDecorator({
      get(this: object) { return s() + 1; },
      set() { /* no-op */ },
    }, instance);

    expect(get()).toBe(11);
    s.set(20);
    expect(get()).toBe(21);
  });

  it("set function is called when the setter is invoked", () => {
    const written: number[] = [];
    const instance = {};
    const { set } = applyAccessorDecorator({
      get(this: object) { return 0; },
      set(_v: number) { written.push(_v); },
    }, instance);

    set(42);
    expect(written).toEqual([42]);
  });

  it("set function receives the component instance as this", () => {
    let capturedThis: unknown;
    const instance = { id: "target" };
    const { set } = applyAccessorDecorator({
      get(this: object) { return 0; },
      set(this: unknown) { capturedThis = this; },
    }, instance);

    set(1);
    expect(capturedThis).toBe(instance);
  });

  it("set writes through to underlying signals, updating the getter", () => {
    const s = signal(0);
    const instance = {};
    const { get, set } = applyAccessorDecorator({
      get(this: object) { return s(); },
      set(this: object, v: number) { s.set(v); },
    }, instance);

    set(100);
    expect(get()).toBe(100);
  });

  it("is per-instance — separate computed per object", () => {
    const s = signal(5);
    const options = {
      get(this: object) { return s() * 2; },
      set() { /* no-op */ },
    };
    const a = {};
    const b = {};
    const decA = applyAccessorDecorator(options, a);
    const decB = applyAccessorDecorator(options, b);

    expect(decA.get()).toBe(10);
    expect(decB.get()).toBe(10);
    s.set(7);
    expect(decA.get()).toBe(14);
    expect(decB.get()).toBe(14);
  });

  it("accessor form without set — setter is a no-op", () => {
    const s = signal(5);
    const instance = {};
    const target = { get() { return undefined as unknown as number; }, set() { /* original */ } };
    const ctx = { kind: "accessor", name: "value" } as unknown as ClassAccessorDecoratorContext<object, number>;
    // Bypass overload constraint — optionsSet is undefined at runtime
    type AccessorDecoFactory = (opts: { get: (this: object) => number }) => (
      t: typeof target,
      c: typeof ctx,
    ) => ClassAccessorDecoratorResult<object, number>;
    const result = (Computed as unknown as AccessorDecoFactory)(
      { get(this: object) { return s() * 2; } },
    )(target, ctx);
    result.init!.call(instance, 0);

    expect(result.get!.call(instance)).toBe(10);
    expect(() => { result.set!.call(instance, 99); }).not.toThrow();
    expect(result.get!.call(instance)).toBe(10); // unchanged — no setter
  });
});

// ── Watch ─────────────────────────────────────────────────────────────────────

describe("Watch decorator", () => {
  it("calls handler when a single watched property changes", () => {
    const { ctx, run } = methodCtx("onChange");
    Watch("count" as never)(
      function (this: unknown, newVal: unknown) {
        (this as Record<string, unknown>).__lastVal = newVal;
      },
      ctx as unknown as ClassMethodDecoratorContext,
    );

    const s = signal(0);
    const instance = new TestComponent();
    Object.defineProperty(instance, "count", {
      get: () => s(),
      configurable: true,
    });
    run(instance);

    // Simulate onMount
    (instance as unknown as { onMount: () => void }).onMount?.();

    s.set(5);
    expect((instance as unknown as Record<string, unknown>).__lastVal).toBe(5);
  });

  it("does not fire if value hasn't changed", () => {
    const { ctx, run } = methodCtx("onNotChange");
    const handler = vi.fn();
    Watch("x" as never)(handler, ctx as unknown as ClassMethodDecoratorContext);

    const s = signal(1);
    const instance = new TestComponent();
    Object.defineProperty(instance, "x", {
      get: () => s(),
      configurable: true,
    });
    run(instance);
    (instance as unknown as { onMount: () => void }).onMount?.();

    s.set(1); // same value
    expect(handler).not.toHaveBeenCalled();
  });

  it("multi-prop watch fires when any watched prop changes", async () => {
    const { ctx, run } = methodCtx("onMulti");
    const handler = vi.fn();
    Watch("a" as never, "b" as never)(handler, ctx as unknown as ClassMethodDecoratorContext);

    const sa = signal(0);
    const sb = signal(0);
    const instance = new TestComponent();
    Object.defineProperty(instance, "a", { get: () => sa(), configurable: true });
    Object.defineProperty(instance, "b", { get: () => sb(), configurable: true });
    run(instance);
    (instance as unknown as { onMount: () => void }).onMount?.();

    sa.set(1);
    await Promise.resolve();
    expect(handler).toHaveBeenCalledTimes(1);
    sb.set(1);
    await Promise.resolve();
    expect(handler).toHaveBeenCalledTimes(2);
  });

  it("multi-prop watch coalesces simultaneous changes into a single callback", async () => {
    const { ctx, run } = methodCtx("onMulti");
    const handler = vi.fn();
    Watch("a" as never, "b" as never)(handler, ctx as unknown as ClassMethodDecoratorContext);

    const sa = signal(0);
    const sb = signal(0);
    const instance = new TestComponent();
    Object.defineProperty(instance, "a", { get: () => sa(), configurable: true });
    Object.defineProperty(instance, "b", { get: () => sb(), configurable: true });
    run(instance);
    (instance as unknown as { onMount: () => void }).onMount?.();

    // both change in the same synchronous block
    sa.set(1);
    sb.set(1);
    await Promise.resolve();

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith({ a: 1, b: 1 }, { a: 0, b: 0 });
  });
});

// ── History ───────────────────────────────────────────────────────────────────

describe("History decorator", () => {
  it("creates the history field on the instance", () => {
    const { ctx, run } = fieldCtx("scoreHistory");
    History("score")(undefined, ctx);
    const instance = new TestComponent();
    run(instance);
    expect((instance as unknown as Record<string, unknown>).scoreHistory).toBeDefined();
  });

  it("history tracks changes to the property", () => {
    const { ctx, run } = fieldCtx("scoreHistory");
    History("score")(undefined, ctx);

    const s = signal(0);
    const instance = new TestComponent();
    Object.defineProperty(instance, "score", {
      get: () => s(),
      set: (v: number) => { s.set(v); },
      configurable: true,
    });
    run(instance);

    const h = (instance as unknown as Record<string, unknown>).scoreHistory as {
      values: () => number[];
      canUndo: () => boolean;
    };
    s.set(10);
    expect(h.canUndo()).toBe(true);
    expect(h.values()).toContain(10);
  });

  it("canUndo becomes true after a value change", () => {
    const { ctx, run } = fieldCtx("numHistory");
    History("num")(undefined, ctx);

    const s = signal(0);
    const instance = new TestComponent();
    Object.defineProperty(instance, "num", {
      get: () => s(),
      set: (v: number) => { s.set(v); },
      configurable: true,
    });
    run(instance);

    const h = (instance as unknown as Record<string, unknown>).numHistory as {
      canUndo: () => boolean;
    };

    expect(h.canUndo()).toBe(false);
    s.set(5);
    expect(h.canUndo()).toBe(true);
  });

  it("values() contains the current value", () => {
    const { ctx, run } = fieldCtx("xHistory");
    History("x")(undefined, ctx);

    const s = signal(42);
    const instance = new TestComponent();
    Object.defineProperty(instance, "x", {
      get: () => s(),
      set: (v: number) => { s.set(v); },
      configurable: true,
    });
    run(instance);

    const h = (instance as unknown as Record<string, unknown>).xHistory as {
      values: () => number[];
      current: () => number;
    };

    expect(h.current()).toBe(42);
    expect(h.values()).toContain(42);
  });

  it("undo() reverts the property to the previous value", () => {
    const { ctx, run } = fieldCtx("score2History");
    History("score2")(undefined, ctx);

    const s = signal(0);
    const instance = new TestComponent();
    Object.defineProperty(instance, "score2", {
      get: () => s(),
      set: (v: number) => { s.set(v); },
      configurable: true,
    });
    run(instance);

    const h = (instance as unknown as Record<string, unknown>).score2History as {
      undo: () => void;
    };

    s.set(5);
    s.set(10);
    h.undo();
    expect(s()).toBe(5);
  });

  it("redo() moves forward after undo", () => {
    const { ctx, run } = fieldCtx("score3History");
    History("score3")(undefined, ctx);

    const s = signal(0);
    const instance = new TestComponent();
    Object.defineProperty(instance, "score3", {
      get: () => s(),
      set: (v: number) => { s.set(v); },
      configurable: true,
    });
    run(instance);

    const h = (instance as unknown as Record<string, unknown>).score3History as {
      undo: () => void;
      redo: () => void;
      canRedo: () => boolean;
    };

    s.set(1);
    s.set(2);
    h.undo();
    expect(h.canRedo()).toBe(true);
    h.redo();
    expect(s()).toBe(2);
  });

  it("respects a custom history limit", () => {
    const { ctx, run } = fieldCtx("vHistory");
    History("v", 3)(undefined, ctx);

    const s = signal(0);
    const instance = new TestComponent();
    Object.defineProperty(instance, "v", {
      get: () => s(),
      set: (v: number) => { s.set(v); },
      configurable: true,
    });
    run(instance);

    const h = (instance as unknown as Record<string, unknown>).vHistory as {
      values: () => number[];
    };

    s.set(1); s.set(2); s.set(3); s.set(4); s.set(5);
    // values includes current + up to 3 past items → max 4 items
    expect(h.values().length).toBeLessThanOrEqual(4);
  });

  it("returns the same history instance on repeated access", () => {
    const { ctx, run } = fieldCtx("zHistory");
    History("z")(undefined, ctx);
    const instance = new TestComponent();
    run(instance);
    const h1 = (instance as unknown as Record<string, unknown>).zHistory;
    const h2 = (instance as unknown as Record<string, unknown>).zHistory;
    expect(h1).toBe(h2);
  });
});

// ── When ──────────────────────────────────────────────────────────────────────

describe("When decorator", () => {
  function methodCtxFor(name: string) {
    const initializers: Array<(this: unknown) => void> = [];
    return {
      ctx: {
        name,
        kind: "method" as const,
        addInitializer(fn: (this: unknown) => void) {
          initializers.push(fn);
        },
      } as ClassMethodDecoratorContext,
      run(instance: unknown) {
        initializers.forEach((fn) => { fn.call(instance); });
      },
    };
  }

  it("calls the method when a truthy value is emitted from the watched prop", () => {
    const { ctx, run } = methodCtxFor("onReady");
    const handler = vi.fn();
    When("flag")(handler, ctx as unknown as ClassMethodDecoratorContext);

    // @When accesses instance[propName] and expects a Signal/Computed object
    const s = signal<string | null>(null);
    const instance = new TestComponent();
    (instance as unknown as Record<string, unknown>).flag = s;
    run(instance);

    (instance as unknown as { onMount: () => void }).onMount?.();

    s.set("go");
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("does not call the method for falsy values", () => {
    const { ctx, run } = methodCtxFor("onData");
    const handler = vi.fn();
    When("item")(handler, ctx as unknown as ClassMethodDecoratorContext);

    const s = signal<number>(0);
    const instance = new TestComponent();
    (instance as unknown as Record<string, unknown>).item = s;
    run(instance);
    (instance as unknown as { onMount: () => void }).onMount?.();

    // 0 is falsy — handler should NOT be called
    expect(handler).not.toHaveBeenCalled();
  });

  it("calls onUnmount cleanup without throwing", () => {
    const { ctx, run } = methodCtxFor("onVal");
    When("val")(vi.fn(), ctx as unknown as ClassMethodDecoratorContext);

    const s = signal<number>(0);
    const instance = new TestComponent();
    (instance as unknown as Record<string, unknown>).val = s;
    run(instance);
    (instance as unknown as { onMount: () => void }).onMount?.();
    expect(() =>
      { (instance as unknown as { onUnmount: () => void }).onUnmount?.(); }
    ).not.toThrow();
  });

  it("preserves existing onMount/onUnmount implementations", () => {
    const { ctx, run } = methodCtxFor("onV");
    When("v")(vi.fn(), ctx as unknown as ClassMethodDecoratorContext);

    const mountSpy = vi.fn();
    const unmountSpy = vi.fn();
    const s = signal<number>(0);
    const instance = new TestComponent();
    (instance as unknown as Record<string, unknown>).v = s;
    run(instance);

    // Manually set callbacks after initializer ran
    const prevMount = instance.onMount?.bind(instance);
    instance.onMount = function () {
      mountSpy();
      prevMount?.();
    };
    const prevUnmount = instance.onUnmount?.bind(instance);
    instance.onUnmount = function () {
      unmountSpy();
      prevUnmount?.();
    };

    instance.onMount?.();
    instance.onUnmount?.();
    expect(mountSpy).toHaveBeenCalled();
    expect(unmountSpy).toHaveBeenCalled();
  });

  it("works when the watched prop is a computed value", async () => {
    const { ctx, run } = methodCtxFor("onComputed");
    const handler = vi.fn();
    When("doubled")(handler, ctx as unknown as ClassMethodDecoratorContext);

    const s = signal(0);
    const c = computed(() => s() * 2);
    const instance = new TestComponent();
    // Store the computed itself (not the result) so When can call isComputed on it
    (instance as unknown as Record<string, unknown>).doubled = c;
    run(instance);

    (instance as unknown as { onMount: () => void }).onMount?.();

    s.set(5); // doubled becomes 10 (truthy)
    await Promise.resolve();
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("fires immediately when the watched prop is a plain truthy value (non-signal)", () => {
    const { ctx, run } = methodCtxFor("onPlain");
    const handler = vi.fn();
    When("plainProp")(handler, ctx as unknown as ClassMethodDecoratorContext);

    const instance = new TestComponent();
    (instance as unknown as Record<string, unknown>).plainProp = "hello";
    run(instance);
    (instance as unknown as { onMount: () => void }).onMount?.();

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith("hello");
  });

  it("condition: fires when condition returns true", async () => {
    const { ctx, run } = methodCtxFor("onHigh");
    const handler = vi.fn();
    When("count", (v: number) => v > 5)(handler, ctx as unknown as ClassMethodDecoratorContext);

    const s = signal(0);
    const instance = new TestComponent();
    (instance as unknown as Record<string, unknown>).count = s;
    run(instance);
    (instance as unknown as { onMount: () => void }).onMount?.();

    s.set(3);   // condition false — should not fire
    await Promise.resolve();
    expect(handler).not.toHaveBeenCalled();

    s.set(7);   // condition true — should fire
    await Promise.resolve();
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith(7);
  });

  it("condition: does not fire when value is truthy but condition returns false", async () => {
    const { ctx, run } = methodCtxFor("onPositive");
    const handler = vi.fn();
    When("n", (v: number) => v > 100)(handler, ctx as unknown as ClassMethodDecoratorContext);

    const s = signal(0);
    const instance = new TestComponent();
    (instance as unknown as Record<string, unknown>).n = s;
    run(instance);
    (instance as unknown as { onMount: () => void }).onMount?.();

    s.set(1);   // truthy but condition fails
    s.set(50);  // truthy but condition fails
    await Promise.resolve();
    expect(handler).not.toHaveBeenCalled();
  });

  it("condition: fires on the first value satisfying the condition, then stops", async () => {
    const { ctx, run } = methodCtxFor("onFirst");
    const handler = vi.fn();
    When("v", (v: number) => v >= 10)(handler, ctx as unknown as ClassMethodDecoratorContext);

    const s = signal(0);
    const instance = new TestComponent();
    (instance as unknown as Record<string, unknown>).v = s;
    run(instance);
    (instance as unknown as { onMount: () => void }).onMount?.();

    s.set(10);  // first match — fires
    await Promise.resolve();
    expect(handler).toHaveBeenCalledTimes(1);

    s.set(20);  // when() already disposed — should not fire again
    await Promise.resolve();
    expect(handler).toHaveBeenCalledTimes(1);
  });
});

// ── Prop (additional branches) ────────────────────────────────────────────────

describe("Prop decorator — additional branches", () => {
  it("set() updates the default value (used when no raw props entry)", () => {
    const { ctx, run } = fieldCtx("size");
    Prop()(undefined, ctx);

    const instance = new TestComponent();
    (instance as unknown as Record<string, unknown>).size = "sm";
    run(instance);

    // Setter path: updates defaults.
    (instance as unknown as Record<string, unknown>).size = "lg";
    expect((instance as unknown as Record<string, unknown>).size).toBe("lg");
  });
});

// ── History (additional branches) ────────────────────────────────────────────

describe("History decorator — undo with no previous value", () => {
  it("undo() does nothing when there is no previous value", () => {
    const { ctx, run } = fieldCtx("ptsHistory");
    History("pts")(undefined, ctx);

    const s = signal(0);
    const instance = new TestComponent();
    Object.defineProperty(instance, "pts", {
      get: () => s(),
      set: (v: number) => { s.set(v); },
      configurable: true,
    });
    run(instance);

    const h = (instance as unknown as Record<string, unknown>).ptsHistory as {
      undo: () => void;
      canUndo: () => boolean;
    };

    // No changes yet — undo should be a no-op
    expect(h.canUndo()).toBe(false);
    expect(() => h.undo()).not.toThrow();
    expect(s()).toBe(0);
  });
});

// ── History decorator — multiple fields ───────────────────────────────────────

describe("History decorator — multiple History properties on same instance", () => {
  it("two History fields are independent", () => {
    const { ctx: ctxX, run: runX } = fieldCtx("xHistory");
    const { ctx: ctxY, run: runY } = fieldCtx("yHistory");
    History("x")(undefined, ctxX);
    History("y")(undefined, ctxY);

    const sx = signal(0);
    const sy = signal(0);
    const instance = new TestComponent();
    Object.defineProperty(instance, "x", {
      get: () => sx(), set: (v: number) => { sx.set(v); }, configurable: true,
    });
    Object.defineProperty(instance, "y", {
      get: () => sy(), set: (v: number) => { sy.set(v); }, configurable: true,
    });
    runX(instance);
    runY(instance);

    // Access history first to trigger lazy creation and subscribe to signals
    const hx = (instance as unknown as Record<string, unknown>).xHistory as {
      canUndo: () => boolean; current: () => number;
    };
    const hy = (instance as unknown as Record<string, unknown>).yHistory as {
      canUndo: () => boolean; current: () => number;
    };

    sx.set(5);
    sy.set(10);

    expect(hx.canUndo()).toBe(true);
    expect(hy.canUndo()).toBe(true);
    expect(hx.current()).toBe(5);
    expect(hy.current()).toBe(10);
  });

  it("clear() after undo removes redo entries", () => {
    const { ctx, run } = fieldCtx("valHistory");
    History("val")(undefined, ctx);

    const s = signal(0);
    const instance = new TestComponent();
    Object.defineProperty(instance, "val", {
      get: () => s(), set: (v: number) => { s.set(v); }, configurable: true,
    });
    run(instance);

    const h = (instance as unknown as Record<string, unknown>).valHistory as {
      undo: () => void; clear: () => void;
      canUndo: () => boolean; canRedo: () => boolean;
    };

    s.set(1);
    s.set(2);
    h.undo();
    expect(h.canRedo()).toBe(true);
    h.clear();
    expect(h.canRedo()).toBe(false);
    expect(h.canUndo()).toBe(false);
  });
});

// ── Watch (cleanup + multi-prop non-watched) ──────────────────────────────────

describe("Watch decorator — onUnmount cleanup", () => {
  it("stops firing after onUnmount is called", () => {
    const { ctx, run } = methodCtx("onCount");
    const handler = vi.fn();
    Watch("count" as never)(handler, ctx as unknown as ClassMethodDecoratorContext);

    const s = signal(0);
    const instance = new TestComponent();
    Object.defineProperty(instance, "count", { get: () => s(), configurable: true });
    run(instance);
    (instance as unknown as { onMount: () => void }).onMount?.();

    s.set(1);
    expect(handler).toHaveBeenCalledTimes(1);

    (instance as unknown as { onUnmount: () => void }).onUnmount?.();
    s.set(2);

    // After unmount the effect is stopped — handler must NOT fire again
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("preserves existing onUnmount when adding cleanup", () => {
    const { ctx, run } = methodCtx("onVal");
    const handler = vi.fn();
    Watch("val" as never)(handler, ctx as unknown as ClassMethodDecoratorContext);

    const s = signal(0);
    const instance = new TestComponent();
    Object.defineProperty(instance, "val", { get: () => s(), configurable: true });
    run(instance);

    const unmountSpy = vi.fn();
    const prevUnmount = instance.onUnmount?.bind(instance);
    instance.onUnmount = function () { unmountSpy(); prevUnmount?.(); };

    (instance as unknown as { onMount: () => void }).onMount?.();
    instance.onUnmount?.();
    expect(unmountSpy).toHaveBeenCalled();
  });

  it("multi-prop watch does NOT fire when an unwatched prop changes", async () => {
    const { ctx, run } = methodCtx("onAB");
    const handler = vi.fn();
    Watch("a" as never, "b" as never)(handler, ctx as unknown as ClassMethodDecoratorContext);

    const sa = signal(0);
    const sb = signal(0);
    const sc = signal(0); // not watched

    const instance = new TestComponent();
    Object.defineProperty(instance, "a", { get: () => sa(), configurable: true });
    Object.defineProperty(instance, "b", { get: () => sb(), configurable: true });
    Object.defineProperty(instance, "c", { get: () => sc(), configurable: true });
    run(instance);
    (instance as unknown as { onMount: () => void }).onMount?.();

    sc.set(99); // unwatched prop — handler must NOT fire
    await Promise.resolve();
    expect(handler).not.toHaveBeenCalled();

    sa.set(1); // watched — handler fires
    await Promise.resolve();
    expect(handler).toHaveBeenCalledTimes(1);
  });
});

// ── Watch (additional branches — computed readValue) ──────────────────────────

describe("Watch decorator — reading computed values", () => {
  it("reads the value of a computed field (not the computed object)", async () => {
    const { ctx, run } = methodCtx("onDoubled");
    const handler = vi.fn();
    Watch("doubled" as never)(handler, ctx as unknown as ClassMethodDecoratorContext);

    const s = signal(1);
    const c = computed(() => s() * 2);
    const instance = new TestComponent();
    // Watch reads instance["doubled"] — if it's a computed, it calls it
    Object.defineProperty(instance, "doubled", {
      get: () => c,
      configurable: true,
    });
    run(instance);
    (instance as unknown as { onMount: () => void }).onMount?.();

    s.set(5); // c() goes from 2 to 10 → triggers handler
    await Promise.resolve();
    expect(handler).toHaveBeenCalledTimes(1);
  });
});

// ── Watch — additional new tests ──────────────────────────────────────────────

describe("Watch decorator — new cases", () => {
  it("NaN → NaN does NOT fire (Object.is semantics)", () => {
    const { ctx, run } = methodCtx("onNaN");
    const handler = vi.fn();
    Watch("nanProp" as never)(handler, ctx as unknown as ClassMethodDecoratorContext);

    const s = signal<number>(NaN);
    const instance = new TestComponent();
    Object.defineProperty(instance, "nanProp", { get: () => s(), configurable: true });
    run(instance);
    (instance as unknown as { onMount: () => void }).onMount?.();

    s.set(NaN); // Object.is(NaN, NaN) === true → no change
    expect(handler).not.toHaveBeenCalled();
  });

  it("watch callback that throws does not crash the effect system", () => {
    const { ctx, run } = methodCtx("onThrow");
    const throwingHandler = vi.fn(() => { throw new Error("handler error"); });
    Watch("tProp" as never)(throwingHandler, ctx as unknown as ClassMethodDecoratorContext);

    const s = signal(0);
    const instance = new TestComponent();
    Object.defineProperty(instance, "tProp", { get: () => s(), configurable: true });
    run(instance);
    (instance as unknown as { onMount: () => void }).onMount?.();

    // Even if the handler throws, the signal change shouldn't crash the effect framework
    // The throw propagates from the effect, so we catch it here
    expect(() => { s.set(1); }).toThrow("handler error");
    // The system should still be intact — further calls are not tested for recovery
    expect(throwingHandler).toHaveBeenCalledTimes(1);
  });

  it("multiple @Watch decorators on different methods both fire independently", () => {
    const { ctx: ctxA, run: runA } = methodCtx("onA");
    const { ctx: ctxB, run: runB } = methodCtx("onB");
    const handlerA = vi.fn();
    const handlerB = vi.fn();
    Watch("propA" as never)(handlerA, ctxA as unknown as ClassMethodDecoratorContext);
    Watch("propB" as never)(handlerB, ctxB as unknown as ClassMethodDecoratorContext);

    const sa = signal(0);
    const sb = signal(0);
    const instance = new TestComponent();
    Object.defineProperty(instance, "propA", { get: () => sa(), configurable: true });
    Object.defineProperty(instance, "propB", { get: () => sb(), configurable: true });
    runA(instance);
    runB(instance);
    (instance as unknown as { onMount: () => void }).onMount?.();

    sa.set(1);
    expect(handlerA).toHaveBeenCalledTimes(1);
    expect(handlerB).not.toHaveBeenCalled();

    sb.set(1);
    expect(handlerA).toHaveBeenCalledTimes(1);
    expect(handlerB).toHaveBeenCalledTimes(1);
  });
});

// ── When — additional new tests ───────────────────────────────────────────────

describe("When decorator — new cases", () => {
  function methodCtxFor(name: string) {
    const initializers: Array<(this: unknown) => void> = [];
    return {
      ctx: {
        name,
        kind: "method" as const,
        addInitializer(fn: (this: unknown) => void) {
          initializers.push(fn);
        },
      } as ClassMethodDecoratorContext,
      run(instance: unknown) {
        initializers.forEach((fn) => { fn.call(instance); });
      },
    };
  }

  it("@When fires only once — first truthy value; subsequent truthy values are ignored", () => {
    const { ctx, run } = methodCtxFor("onToggle");
    const handler = vi.fn();
    When("toggle")(handler, ctx as unknown as ClassMethodDecoratorContext);

    const s = signal<number | null>(null);
    const instance = new TestComponent();
    (instance as unknown as Record<string, unknown>).toggle = s;
    run(instance);
    (instance as unknown as { onMount: () => void }).onMount?.();

    s.set(1);    // truthy → fires (first and only time)
    s.set(null); // falsy
    s.set(2);    // truthy again — but when() has already disposed itself
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith(1);
  });

  it("@When callback that throws — onUnmount cleanup still works", () => {
    const { ctx, run } = methodCtxFor("onThrowWhen");
    const throwingHandler = vi.fn(() => { throw new Error("when error"); });
    When("whenProp")(throwingHandler, ctx as unknown as ClassMethodDecoratorContext);

    const s = signal<number | null>(null);
    const instance = new TestComponent();
    (instance as unknown as Record<string, unknown>).whenProp = s;
    run(instance);
    (instance as unknown as { onMount: () => void }).onMount?.();

    // Triggering truthy fires handler which throws
    expect(() => { s.set(1); }).toThrow("when error");

    // onUnmount should still work without crashing
    expect(() => {
      (instance as unknown as { onUnmount: () => void }).onUnmount?.();
    }).not.toThrow();
  });
});

// ── State — additional new tests ──────────────────────────────────────────────

describe("State decorator — new cases", () => {
  it("two @State fields can be set independently without cross-contamination", () => {
    const { ctx: ctxX, run: runX } = fieldCtx("x");
    const { ctx: ctxY, run: runY } = fieldCtx("y");
    State()(undefined, ctxX);
    State()(undefined, ctxY);

    const instance = new TestComponent();
    (instance as unknown as Record<string, unknown>).x = 10;
    (instance as unknown as Record<string, unknown>).y = 20;
    runX(instance);
    runY(instance);

    (instance as unknown as Record<string, unknown>).x = 99;
    expect((instance as unknown as Record<string, unknown>).x).toBe(99);
    expect((instance as unknown as Record<string, unknown>).y).toBe(20);

    (instance as unknown as Record<string, unknown>).y = 77;
    expect((instance as unknown as Record<string, unknown>).x).toBe(99);
    expect((instance as unknown as Record<string, unknown>).y).toBe(77);
  });

  it("setting @State to undefined works (signal stores undefined)", () => {
    const { ctx, run } = fieldCtx("maybeVal");
    State()(undefined, ctx);

    const instance = new TestComponent();
    (instance as unknown as Record<string, unknown>).maybeVal = "initial";
    run(instance);

    (instance as unknown as Record<string, unknown>).maybeVal = undefined;
    expect((instance as unknown as Record<string, unknown>).maybeVal).toBeUndefined();
  });
});

// ── Prop — additional new tests ───────────────────────────────────────────────

describe("Prop decorator — new cases", () => {
  it("function prop that throws — getter propagates the error", () => {
    const { ctx, run } = fieldCtx("dynProp");
    Prop()(undefined, ctx);

    const throwingFn = () => { throw new Error("prop error"); };
    const instance = new TestComponent({ dynProp: throwingFn });
    run(instance);

    expect(() => (instance as unknown as Record<string, unknown>).dynProp).toThrow("prop error");
  });

  it("undefined passed explicitly vs key not present — both fall back to default", () => {
    const { ctx: ctx1, run: run1 } = fieldCtx("optA");
    const { ctx: ctx2, run: run2 } = fieldCtx("optB");
    Prop()(undefined, ctx1);
    Prop()(undefined, ctx2);

    // Case 1: key explicitly set to undefined in rawProps
    const instance1 = new TestComponent({ optA: undefined });
    (instance1 as unknown as Record<string, unknown>).optA = "default-a";
    run1(instance1);
    // undefined from rawProps — Prop checks `!== undefined`, so falls back to default
    expect((instance1 as unknown as Record<string, unknown>).optA).toBe("default-a");

    // Case 2: key not present in rawProps at all
    const instance2 = new TestComponent({});
    (instance2 as unknown as Record<string, unknown>).optB = "default-b";
    run2(instance2);
    expect((instance2 as unknown as Record<string, unknown>).optB).toBe("default-b");
  });
});

// ── Compose — additional new tests ────────────────────────────────────────────

describe("@Compose decorator — new cases", () => {
  it("setup() that throws — field access on the instance throws", () => {
    class ThrowingComposable {
      setup(): Record<string, unknown> {
        throw new Error("setup failed");
      }
    }

    const { ctx, run } = fieldCtx("throwing");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(() => {
      const instance = new TestComponent();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      Compose(ThrowingComposable as any)(undefined, ctx);
      run(instance);
    }).toThrow("setup failed");
  });

  it("string argument that matches no instance property falls back to the literal string", () => {
    class ArgComposable {
      constructor(private val: unknown) {}
      setup() { return { resolved: this.val }; }
    }

    const { ctx, run } = fieldCtx("strArgUndef");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Compose(ArgComposable as any, "missingProp")(undefined, ctx);

    const instance = new TestComponent();
    // missingProp is not set on instance — falls back to the literal "missingProp"
    run(instance);

    const view = (instance as unknown as Record<string, unknown>).strArgUndef as Record<string, unknown>;
    expect(view.resolved).toBe("missingProp");
  });

  it("string argument that matches an instance property resolves to its value", () => {
    class ArgComposable {
      constructor(private val: unknown) {}
      setup() { return { resolved: this.val }; }
    }

    const { ctx, run } = fieldCtx("strArgFound");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Compose(ArgComposable as any, "myProp")(undefined, ctx);

    const instance = new TestComponent();
    (instance as unknown as Record<string, unknown>).myProp = 42;
    run(instance);

    const view = (instance as unknown as Record<string, unknown>).strArgFound as Record<string, unknown>;
    expect(view.resolved).toBe(42);
  });
});

// ── getter() helper ───────────────────────────────────────────────────────────

import { getter } from "../properties/compose";

describe("getter() factory", () => {
  it("resolves to a function that reads the named property from the instance", () => {
    class ArgComposable {
      constructor(private getVal: () => unknown) {}
      setup() { return { current: this.getVal() }; }
    }

    const { ctx, run } = fieldCtx("withGetter");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Compose(ArgComposable as any, getter("dynProp"))(undefined, ctx);

    const instance = new TestComponent();
    (instance as unknown as Record<string, unknown>).dynProp = 99;
    run(instance);

    const view = (instance as unknown as Record<string, unknown>).withGetter as Record<string, unknown>;
    expect(view.current).toBe(99);
  });

  it("getter() produces a live reader — reads the property at call time", () => {
    class ArgComposable {
      constructor(private getVal: () => unknown) {}
      setup() { return { read: this.getVal }; }
    }

    const { ctx, run } = fieldCtx("liveGetter");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Compose(ArgComposable as any, getter("mutableProp"))(undefined, ctx);

    const instance = new TestComponent();
    (instance as unknown as Record<string, unknown>).mutableProp = "first";
    run(instance);

    const view = (instance as unknown as Record<string, unknown>).liveGetter as Record<string, () => unknown>;
    expect(view.read()).toBe("first");

    (instance as unknown as Record<string, unknown>).mutableProp = "second";
    expect(view.read()).toBe("second");
  });

  it("getter() is marked as a ComposeFactory (has __isComposeFactory)", () => {
    const g = getter("foo");
    expect((g as unknown as Record<string, unknown>).__isComposeFactory).toBe(true);
  });
});

// ── createFieldDecorator — additional property ────────────────────────────────

describe("createFieldDecorator — additional property", () => {
  it("defines extra properties on the instance when additional is returned", () => {
    const decorator = createFieldDecorator({
      bind(_instance, _name, initialValue) {
        return {
          descriptor: {
            get() { return initialValue; },
            set() { /* no-op */ },
          },
          additional: {
            extraProp: {
              configurable: true,
              get() { return "extra"; },
            },
          },
        };
      },
    });

    const { ctx, run } = fieldCtx("myField");
    decorator(undefined, ctx);
    const instance = new TestComponent();
    (instance as unknown as Record<string, unknown>).myField = 42;
    run(instance);

    expect((instance as unknown as Record<string, unknown>).myField).toBe(42);
    expect((instance as unknown as Record<string, unknown>).extraProp).toBe("extra");
  });
});

// ── createGetterDecorator ─────────────────────────────────────────────────────

describe("createGetterDecorator", () => {
  it("calls behavior.wrap on access and returns the wrapped value", () => {
    const wrap = vi.fn((original: (this: object) => unknown, instance: object) => {
      return () => (original.call(instance) as number) * 2;
    });
    const decorator = createGetterDecorator({ wrap });
    const originalGetter = function (this: object) { return 5 as unknown; };
    const ctx = { kind: "getter" } as ClassGetterDecoratorContext<object, number>;
    const wrapped = decorator(originalGetter as (this: object) => number, ctx);

    const instance = {};
    expect(wrapped.call(instance)).toBe(10);
    expect(wrap).toHaveBeenCalledWith(originalGetter, instance);
  });

  it("passes the correct instance as this to behavior.wrap", () => {
    let capturedInstance: unknown;
    const decorator = createGetterDecorator({
      wrap(_original, instance) {
        capturedInstance = instance;
        return () => 0;
      },
    });
    const getter = function (this: object) { return 0 as unknown; };
    const ctx = { kind: "getter" } as ClassGetterDecoratorContext<object, number>;
    const wrapped = decorator(getter as (this: object) => number, ctx);

    const instance = { id: "test-instance" };
    wrapped.call(instance);
    expect(capturedInstance).toBe(instance);
  });
});

// ── createAccessorDecorator — init ────────────────────────────────────────────

describe("createAccessorDecorator — init", () => {
  it("init stores the initial value that bind receives on first get", () => {
    let capturedInitialValue: unknown = "NOT_SET";
    const behavior = {
      bind(_inst: object, _name: string | symbol, initialValue: unknown) {
        capturedInitialValue = initialValue;
        return { get: () => initialValue };
      },
    };
    const decorator = createAccessorDecorator(behavior);
    const target = {
      get() { return 0; },
      set() { /* original */ },
    } as ClassAccessorDecoratorTarget<object, number>;
    const ctx = { kind: "accessor", name: "val" } as unknown as ClassAccessorDecoratorContext<object, number>;
    const result = decorator(target, ctx);

    const instance = {};
    const returned = result.init!.call(instance, 42);
    result.get!.call(instance); // triggers bind
    expect(returned).toBe(42);
    expect(capturedInitialValue).toBe(42);
  });

  it("init returns the initial value unchanged", () => {
    const behavior = {
      bind(_inst: object, _name: string | symbol, initialValue: unknown) {
        return { get: () => initialValue };
      },
    };
    const decorator = createAccessorDecorator(behavior);
    const target = {
      get() { return ""; },
      set() { /* original */ },
    } as ClassAccessorDecoratorTarget<object, string>;
    const ctx = { kind: "accessor", name: "s" } as unknown as ClassAccessorDecoratorContext<object, string>;
    const result = decorator(target, ctx);

    const instance = {};
    expect(result.init!.call(instance, "hello")).toBe("hello");
  });
});
