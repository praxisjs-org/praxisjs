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
});

describe("UseStore decorator", () => {
  it("injects a singleton store instance via getter", () => {
    class AppStore {
      name = "app";
    }
    Store()(AppStore, {} as ClassDecoratorContext);

    const initializers: Array<(this: unknown) => void> = [];
    const ctx = {
      name: "store",
      kind: "field" as const,
      addInitializer(fn: (this: unknown) => void) { initializers.push(fn); },
    } as ClassFieldDecoratorContext;

    UseStore(AppStore)(undefined, ctx);

    const instance: Record<string, unknown> = {};
    initializers.forEach((fn) => { fn.call(instance); });

    expect(instance.store).toBeInstanceOf(AppStore);
    expect((instance.store as AppStore).name).toBe("app");
  });

  it("returns the same instance on repeated access (singleton)", () => {
    class SharedStore {}
    Store()(SharedStore, {} as ClassDecoratorContext);

    const initializers: Array<(this: unknown) => void> = [];
    const ctx = {
      name: "sharedStore",
      kind: "field" as const,
      addInitializer(fn: (this: unknown) => void) { initializers.push(fn); },
    } as ClassFieldDecoratorContext;

    UseStore(SharedStore)(undefined, ctx);

    const a: Record<string, unknown> = {};
    const b: Record<string, unknown> = {};
    initializers.forEach((fn) => { fn.call(a); });
    initializers.forEach((fn) => { fn.call(b); });

    expect(a.sharedStore).toBe(b.sharedStore);
  });
});
