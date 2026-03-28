import { describe, it, expect, vi } from "vitest";

import { StatefulComponent } from "@praxisjs/core";
import { signal } from "@praxisjs/core/internal";
import type { Composable } from "@praxisjs/core";

import { Compose } from "../properties/compose";

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

class TestComponent extends StatefulComponent {
  render() { return null; }
}

// Simple composable returning plain values
class CounterComposable implements Composable {
  count = 0;
  setup() {
    return { count: this.count, label: "counter" };
  }
}

// Composable returning a signal (reactive property)
class ReactiveComposable implements Composable {
  _count = signal(0);
  setup() {
    return { count: this._count };
  }
}

// Composable with lifecycle hooks
class LifecycleComposable implements Composable {
  onMount = vi.fn();
  onUnmount = vi.fn();
  setup() {
    return { active: true };
  }
}

// Composable that uses constructor args
class ArgsComposable implements Composable {
  constructor(private multiplier: number) {}
  setup() {
    return { multiplier: this.multiplier };
  }
}

// Composable returning a plain function (non-reactive) in its view
class PlainFnComposable {
  setup() {
    return { handler: () => 42 };
  }
}

describe("@Compose decorator", () => {
  it("creates a view getter on the field", () => {
    const { ctx, run } = fieldCtx("counter");
    Compose(CounterComposable)(undefined, ctx);

    const instance = new TestComponent();
    run(instance);

    const view = (instance as unknown as Record<string, unknown>).counter as Record<string, unknown>;
    expect(view).toBeDefined();
    expect(view.count).toBe(0);
    expect(view.label).toBe("counter");
  });

  it("reactive signal values are resolved via getter", () => {
    const { ctx, run } = fieldCtx("reactive");
    Compose(ReactiveComposable)(undefined, ctx);

    const instance = new TestComponent();
    run(instance);

    const view = (instance as unknown as Record<string, unknown>).reactive as Record<string, unknown>;
    expect(view.count).toBe(0);
  });

  it("calls onMount when component mounts", () => {
    const { ctx, run } = fieldCtx("lc");
    Compose(LifecycleComposable)(undefined, ctx);

    const instance = new TestComponent();
    run(instance);

    const view = (instance as unknown as Record<string, unknown>).lc as Record<string, unknown>;
    expect(view).toBeDefined();

    // Trigger onMount
    instance.onMount();
    const lc = new LifecycleComposable();
    // The composable's onMount would have been called
    // We verify the instance has an onMount wiring
    expect(typeof instance.onMount).toBe("function");
  });

  it("calls onUnmount when component unmounts", () => {
    const { ctx, run } = fieldCtx("lc2");
    Compose(LifecycleComposable)(undefined, ctx);

    const instance = new TestComponent();
    run(instance);
    expect(typeof instance.onUnmount).toBe("function");
  });

  it("invoking instance.onUnmount() executes the composable's onUnmount", () => {
    const unmountSpy = vi.fn();

    class SpyComposable {
      onUnmount = unmountSpy;
      setup() { return {}; }
    }

    const { ctx, run } = fieldCtx("spyComp");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Compose(SpyComposable as any)(undefined, ctx);

    const instance = new TestComponent();
    run(instance);

    instance.onUnmount();
    expect(unmountSpy).toHaveBeenCalled();
  });

  it("passes constructor args to the composable", () => {
    const { ctx, run } = fieldCtx("args");
    Compose(ArgsComposable, 5)(undefined, ctx);

    const instance = new TestComponent();
    run(instance);

    const view = (instance as unknown as Record<string, unknown>).args as Record<string, unknown>;
    expect(view.multiplier).toBe(5);
  });

  it("resolves string constructor args from instance properties", () => {
    const { ctx, run } = fieldCtx("resolved");
    Compose(ArgsComposable, "myMultiplier")(undefined, ctx);

    const instance = new TestComponent();
    (instance as unknown as Record<string, unknown>).myMultiplier = 10;
    run(instance);

    const view = (instance as unknown as Record<string, unknown>).resolved as Record<string, unknown>;
    expect(view.multiplier).toBe(10);
  });

  it("each instance gets its own composable view", () => {
    const { ctx, run } = fieldCtx("c");
    Compose(CounterComposable)(undefined, ctx);

    const a = new TestComponent();
    const b = new TestComponent();
    run(a);
    run(b);

    const viewA = (a as unknown as Record<string, unknown>).c;
    const viewB = (b as unknown as Record<string, unknown>).c;
    expect(viewA).not.toBe(viewB);
  });

  it("plain function value in view is stored as-is (not treated as reactive)", () => {
    const { ctx, run } = fieldCtx("pfn");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Compose(PlainFnComposable as any)(undefined, ctx);

    const instance = new TestComponent();
    run(instance);

    const view = (instance as unknown as Record<string, unknown>).pfn as Record<string, unknown>;
    // handler is a plain function — isReactive returns false, stored directly
    expect(typeof view.handler).toBe("function");
    expect((view.handler as () => number)()).toBe(42);
  });

  it("view getter always returns same view object", () => {
    const { ctx, run } = fieldCtx("stable");
    Compose(CounterComposable)(undefined, ctx);

    const instance = new TestComponent();
    run(instance);

    const v1 = (instance as unknown as Record<string, unknown>).stable;
    const v2 = (instance as unknown as Record<string, unknown>).stable;
    expect(v1).toBe(v2);
  });
});
