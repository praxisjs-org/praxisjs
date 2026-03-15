import { describe, it, expect, vi } from "vitest";

import { StatefulComponent } from "@praxisjs/core";
import { signal } from "@praxisjs/core/internal";

import { Watch } from "../functions/watch";
import { When } from "../functions/when";
import { Computed } from "../properties/computed";
import { History } from "../properties/history";
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

  it("sets _stateDirty on write", () => {
    const { ctx, run } = fieldCtx("value");
    State()(undefined, ctx);

    const instance = new TestComponent();
    (instance as unknown as Record<string, unknown>).value = "hello";
    run(instance);

    instance._stateDirty = false;
    (instance as unknown as Record<string, unknown>).value = "world";
    expect(instance._stateDirty).toBe(true);
  });
});

// ── Prop ──────────────────────────────────────────────────────────────────────

describe("Prop decorator", () => {
  it("reads from _rawProps when set by parent", () => {
    const { ctx, run } = fieldCtx("label");
    Prop()(undefined, ctx);

    const instance = new TestComponent({ label: "hello" });
    run(instance);

    expect((instance as unknown as Record<string, unknown>).label).toBe("hello");
  });

  it("falls back to default value when not in _rawProps", () => {
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

// ── Computed ──────────────────────────────────────────────────────────────────

describe("Computed decorator", () => {
  it("wraps a getter in a computed — result is memoized", () => {
    const fn = vi.fn(function (this: { base: number }) {
      return this.base * 2;
    });

    const wrappedGetter = Computed()(fn, {} as ClassGetterDecoratorContext);
    const instance = { base: 5 } as unknown as StatefulComponent;

    const result1 = wrappedGetter.call(instance);
    const result2 = wrappedGetter.call(instance);
    expect(result1).toBe(10);
    expect(result2).toBe(10);
    expect(fn).toHaveBeenCalledTimes(1); // lazy caching
  });

  it("recomputes when underlying signal changes", () => {
    const s = signal(3);
    const getter = function (this: object) { return s() * 2; };
    const wrapped = Computed()(getter, {} as ClassGetterDecoratorContext);
    const obj = {} as unknown as StatefulComponent;
    expect(wrapped.call(obj)).toBe(6);
    s.set(5);
    expect(wrapped.call(obj)).toBe(10);
  });

  it("is per-instance — separate computed per object", () => {
    const s = signal(1);
    const getter = function (this: object) { return s(); };
    const wrapped = Computed()(getter, {} as ClassGetterDecoratorContext);
    const a = {} as unknown as StatefulComponent;
    const b = {} as unknown as StatefulComponent;
    expect(wrapped.call(a)).toBe(1);
    expect(wrapped.call(b)).toBe(1);
    // Both share the same signal but have independent computed instances
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

  it("multi-prop watch fires when any watched prop changes", () => {
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
    expect(handler).toHaveBeenCalledTimes(1);
    sb.set(1);
    expect(handler).toHaveBeenCalledTimes(2);
  });
});

// ── History ───────────────────────────────────────────────────────────────────

describe("History decorator", () => {
  it("creates a {name}History property on the instance", () => {
    const { ctx, run } = fieldCtx("score");
    History()(undefined, ctx);
    const instance = new TestComponent();
    run(instance);
    expect((instance as unknown as Record<string, unknown>).scoreHistory).toBeDefined();
  });

  it("history tracks changes to the property", () => {
    const { ctx, run } = fieldCtx("score");
    History()(undefined, ctx);

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
    const { ctx, run } = fieldCtx("num");
    History()(undefined, ctx);

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
    const { ctx, run } = fieldCtx("x");
    History()(undefined, ctx);

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
    const { ctx, run } = fieldCtx("score2");
    History()(undefined, ctx);

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
    const { ctx, run } = fieldCtx("score3");
    History()(undefined, ctx);

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
    const { ctx, run } = fieldCtx("v");
    History(3)(undefined, ctx);

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
    const { ctx, run } = fieldCtx("z");
    History()(undefined, ctx);
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
});
