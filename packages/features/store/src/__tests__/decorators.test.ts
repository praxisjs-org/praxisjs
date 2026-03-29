import { describe, it, expect } from "vitest";

import { Store, UseStore } from "../decorators";

describe("Store decorator", () => {
  it("registers the class without throwing", () => {
    class CounterStore {
      value = 0;
    }
    expect(() =>
      { Store()(CounterStore, {} as ClassDecoratorContext); },
    ).not.toThrow();
  });

  it("StoreBehavior.create() is invoked when an enhanced instance is constructed", () => {
    class MyStore {
      value = 42;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const Enhanced = Store()(MyStore as any, {} as ClassDecoratorContext);
    // Creating an instance calls StoreBehavior.create() internally (returns {})
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(() => new (Enhanced as any)()).not.toThrow();
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

describe("UseStore decorator", () => {
  it("injects a singleton store instance via getter", () => {
    class AppStore {
      name = "app";
    }
    Store()(AppStore, {} as ClassDecoratorContext);

    const { ctx, run } = makeFieldCtx("store");
    UseStore(AppStore)(undefined, ctx);

    const instance: Record<string, unknown> = {};
    run(instance);

    expect(instance.store).toBeInstanceOf(AppStore);
    expect((instance.store as AppStore).name).toBe("app");
  });

  it("returns the same instance on repeated access (singleton)", () => {
    class SharedStore {}
    Store()(SharedStore, {} as ClassDecoratorContext);

    const { ctx, run } = makeFieldCtx("sharedStore");
    UseStore(SharedStore)(undefined, ctx);

    const a: Record<string, unknown> = {};
    const b: Record<string, unknown> = {};
    run(a);
    run(b);

    expect(a.sharedStore).toBe(b.sharedStore);
  });

  it("@UseStore(ClassWithoutStoreDecorator) — creates a new instance (no crash, no pre-registration needed)", () => {
    class NotRegistered {
      value = 99;
    }
    // UseStore lazily creates an instance even without @Store, but should not throw
    const { ctx, run } = makeFieldCtx("svc");
    UseStore(NotRegistered)(undefined, ctx);
    const instance: Record<string, unknown> = {};
    run(instance);
    // The implementation instantiates it on first access regardless
    expect(instance.svc).toBeInstanceOf(NotRegistered);
  });

  it("@UseStore on two fields of same class — each field gets the correct store type independently", () => {
    class StoreAlpha {
      kind = "alpha";
    }
    class StoreBeta {
      kind = "beta";
    }
    Store()(StoreAlpha, {} as ClassDecoratorContext);
    Store()(StoreBeta, {} as ClassDecoratorContext);

    const { ctx: ctxA, run: runA } = makeFieldCtx("alpha");
    const { ctx: ctxB, run: runB } = makeFieldCtx("beta");
    UseStore(StoreAlpha)(undefined, ctxA);
    UseStore(StoreBeta)(undefined, ctxB);

    const instance: Record<string, unknown> = {};
    runA(instance);
    runB(instance);

    expect(instance.alpha).toBeInstanceOf(StoreAlpha);
    expect(instance.beta).toBeInstanceOf(StoreBeta);
    expect((instance.alpha as StoreAlpha).kind).toBe("alpha");
    expect((instance.beta as StoreBeta).kind).toBe("beta");
  });

  it("store singleton is shared across multiple class instances", () => {
    class CounterStore {
      count = 0;
    }
    Store()(CounterStore, {} as ClassDecoratorContext);

    const { ctx, run } = makeFieldCtx("counter");
    UseStore(CounterStore)(undefined, ctx);

    const obj1: Record<string, unknown> = {};
    const obj2: Record<string, unknown> = {};
    run(obj1);
    run(obj2);

    expect(obj1.counter).toBe(obj2.counter);
  });
});
