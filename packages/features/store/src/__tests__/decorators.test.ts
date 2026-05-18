import { describe, it, expect } from "vitest";

import { Storable, Store, store, ReactiveStore } from "../decorators";

describe("@Storable decorator", () => {
  it("registers the class without throwing", () => {
    class CounterStore extends ReactiveStore {
      value = 0;
    }
    expect(() =>
      { Storable()(CounterStore, {} as ClassDecoratorContext); },
    ).not.toThrow();
  });

  it("returns void and the original class remains directly instantiable", () => {
    class MyStore extends ReactiveStore {
      value = 42;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = Storable()(MyStore as any, {} as ClassDecoratorContext);
    expect(result).toBeUndefined();
    expect(() => new MyStore()).not.toThrow();
    expect(new MyStore().value).toBe(42);
  });
});

function makeFieldCtx(name: string) {
  const initializers: Array<(this: unknown) => void> = [];
  return {
    ctx: {
      name,
      kind: "field" as const,
      addInitializer(fn: (this: unknown) => void) { initializers.push(fn); },
    } as ClassFieldDecoratorContext,
    run(instance: unknown) { initializers.forEach((fn) => { fn.call(instance); }); },
  };
}

describe("@Store field decorator", () => {
  it("injects a singleton store instance via getter", () => {
    class AppStore extends ReactiveStore {
      name = "app";
    }
    Storable()(AppStore, {} as ClassDecoratorContext);

    const { ctx, run } = makeFieldCtx("store");
    Store(AppStore)(undefined, ctx);

    const instance: Record<string, unknown> = {};
    run(instance);

    expect(instance.store).toBeInstanceOf(AppStore);
    expect((instance.store as AppStore).name).toBe("app");
  });

  it("returns the same instance on repeated access (singleton)", () => {
    class SharedStore extends ReactiveStore {}
    Storable()(SharedStore, {} as ClassDecoratorContext);

    const { ctx, run } = makeFieldCtx("sharedStore");
    Store(SharedStore)(undefined, ctx);

    const a: Record<string, unknown> = {};
    const b: Record<string, unknown> = {};
    run(a);
    run(b);

    expect(a.sharedStore).toBe(b.sharedStore);
  });

  it("@Store(ClassWithoutStorable) — creates a new instance (no crash, no pre-registration needed)", () => {
    class NotRegistered {
      value = 99;
    }
    const { ctx, run } = makeFieldCtx("svc");
    Store(NotRegistered)(undefined, ctx);
    const instance: Record<string, unknown> = {};
    run(instance);
    expect(instance.svc).toBeInstanceOf(NotRegistered);
  });

  it("two @Store fields on the same class each get the correct store type", () => {
    class StoreAlpha extends ReactiveStore {
      kind = "alpha";
    }
    class StoreBeta extends ReactiveStore {
      kind = "beta";
    }
    Storable()(StoreAlpha, {} as ClassDecoratorContext);
    Storable()(StoreBeta, {} as ClassDecoratorContext);

    const { ctx: ctxA, run: runA } = makeFieldCtx("alpha");
    const { ctx: ctxB, run: runB } = makeFieldCtx("beta");
    Store(StoreAlpha)(undefined, ctxA);
    Store(StoreBeta)(undefined, ctxB);

    const instance: Record<string, unknown> = {};
    runA(instance);
    runB(instance);

    expect(instance.alpha).toBeInstanceOf(StoreAlpha);
    expect(instance.beta).toBeInstanceOf(StoreBeta);
    expect((instance.alpha as StoreAlpha).kind).toBe("alpha");
    expect((instance.beta as StoreBeta).kind).toBe("beta");
  });

  it("singleton is shared across multiple component instances", () => {
    class CounterStore extends ReactiveStore {
      count = 0;
    }
    Storable()(CounterStore, {} as ClassDecoratorContext);

    const { ctx, run } = makeFieldCtx("counter");
    Store(CounterStore)(undefined, ctx);

    const obj1: Record<string, unknown> = {};
    const obj2: Record<string, unknown> = {};
    run(obj1);
    run(obj2);

    expect(obj1.counter).toBe(obj2.counter);
  });

  it("shares the same instance as store() (same registry)", () => {
    class FlagsStore extends ReactiveStore {
      enabled = true;
    }
    Storable()(FlagsStore, {} as ClassDecoratorContext);

    const { ctx, run } = makeFieldCtx("flags");
    Store(FlagsStore)(undefined, ctx);
    const obj: Record<string, unknown> = {};
    run(obj);

    expect(obj.flags).toBe(store(FlagsStore));
  });
});

// ── store() ────────────────────────────────────────────────────────────────

describe("store()", () => {
  it("returns a store instance without requiring a class field", () => {
    class ProfileStore extends ReactiveStore {
      name = "alice";
    }
    Storable()(ProfileStore, {} as ClassDecoratorContext);

    const instance = store(ProfileStore);
    expect(instance).toBeInstanceOf(ProfileStore);
    expect(instance.name).toBe("alice");
  });

  it("returns the same singleton instance on repeated calls", () => {
    class TimerStore extends ReactiveStore {
      ticks = 0;
    }
    Storable()(TimerStore, {} as ClassDecoratorContext);

    expect(store(TimerStore)).toBe(store(TimerStore));
  });

  it("lazily creates the instance on first call", () => {
    class LazyStore extends ReactiveStore {
      ready = false;
    }
    Storable()(LazyStore, {} as ClassDecoratorContext);

    const instance = store(LazyStore);
    expect(instance).toBeInstanceOf(LazyStore);
  });

  it("works without @Storable — creates a plain instance", () => {
    class BareStore extends ReactiveStore {
      value = 7;
    }
    const instance = store(BareStore);
    expect(instance).toBeInstanceOf(BareStore);
    expect(instance.value).toBe(7);
  });

  it("mutations on the returned instance are reflected on subsequent calls", () => {
    class ThemeStore extends ReactiveStore {
      dark = false;
    }
    Storable()(ThemeStore, {} as ClassDecoratorContext);

    store(ThemeStore).dark = true;
    expect(store(ThemeStore).dark).toBe(true);
  });
});
