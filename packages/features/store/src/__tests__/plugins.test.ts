import { describe, it, expect, beforeEach, vi } from "vitest";

import { clearPlugins, useStorePlugin } from "../plugin-registry";
import { createStore } from "../create-store";
import { Storable, store, ReactiveStore } from "../decorators";
import type { StorePlugin, StoreMutation, StoreActionResult } from "../plugin-types";

// Isolate global plugins between tests
beforeEach(() => clearPlugins());

// ── createStore — per-store plugins ──────────────────────────────────────────

describe("createStore — per-store plugins (options.plugins)", () => {
  it("onInit receives storeName and store reference", () => {
    const ctx: { storeName?: string; store?: unknown } = {};
    const plugin: StorePlugin = {
      name: "p",
      onInit(context) { ctx.storeName = context.storeName; ctx.store = context.store; },
    };

    createStore({ count: 0 }, { name: "counter", plugins: [plugin] });
    expect(ctx.storeName).toBe("counter");
    expect(ctx.store).toBeDefined();
  });

  it("storeName defaults to 'anonymous' when not provided", () => {
    let received = "";
    createStore({ count: 0 }, { plugins: [{ name: "p", onInit({ storeName }) { received = storeName; } }] });
    expect(received).toBe("anonymous");
  });

  it("onMutation fires when a signal is set", () => {
    const mutations: StoreMutation[] = [];
    const s = createStore({ count: 0 }, {
      name: "counter",
      plugins: [{ name: "p", onMutation(m) { mutations.push(m); } }],
    })();

    (s as unknown as { count: number }).count = 5;

    expect(mutations).toHaveLength(1);
    expect(mutations[0]).toMatchObject({ key: "count", value: 5, prevValue: 0, storeName: "counter" });
  });

  it("onMutation fires per key when $patch is called", () => {
    const keys: string[] = [];
    const s = createStore({ a: 1, b: 2 }, {
      name: "s",
      plugins: [{ name: "p", onMutation({ key }) { keys.push(key); } }],
    })();

    (s as unknown as { $patch: (p: Record<string, unknown>) => void }).$patch({ a: 10, b: 20 });
    expect(keys).toContain("a");
    expect(keys).toContain("b");
  });

  it("onMutation does NOT fire for $reset", () => {
    const mutations: string[] = [];
    const s = createStore({ count: 0 }, {
      plugins: [{ name: "p", onMutation({ key }) { mutations.push(key); } }],
    })();

    (s as unknown as { count: number }).count = 99;
    mutations.length = 0;
    (s as unknown as { $reset: () => void }).$reset();
    expect(mutations).toHaveLength(0);
  });

  it("onAction fires before the method; onActionDone fires after", () => {
    const log: string[] = [];
    const s = createStore({
      count: 0,
      increment() { log.push("run"); (this as unknown as { count: number }).count++; },
    }, {
      name: "s",
      plugins: [{
        name: "p",
        onAction({ name }) { log.push(`before:${name}`); },
        onActionDone({ name, result }) { log.push(`done:${name}:${String(result)}`); },
      }],
    })();

    (s as unknown as { increment: () => void }).increment();
    expect(log).toEqual(["before:increment", "run", "done:increment:undefined"]);
  });

  it("onActionDone resolves with value for async actions", async () => {
    const results: StoreActionResult[] = [];
    const s = createStore(
      { async fetch() { return 42; } },
      { plugins: [{ name: "p", onActionDone(r) { results.push(r); } }] },
    )();

    await (s as unknown as { fetch: () => Promise<number> }).fetch();
    expect(results[0].result).toBe(42);
    expect(results[0].error).toBeUndefined();
  });

  it("onActionDone receives error when async action rejects", async () => {
    const results: StoreActionResult[] = [];
    const boom = new Error("boom");
    const s = createStore(
      { async fail() { throw boom; } },
      { plugins: [{ name: "p", onActionDone(r) { results.push(r); } }] },
    )();

    await expect((s as unknown as { fail: () => Promise<void> }).fail()).rejects.toThrow("boom");
    expect(results[0].error).toBe(boom);
    expect(results[0].result).toBeUndefined();
  });

  it("onInit extend() adds properties to the store", () => {
    const s = createStore({ count: 0 }, {
      plugins: [{
        name: "p",
        onInit({ extend }) { extend({ $version: "2.0" }); },
      }],
    })();

    expect((s as unknown as { $version: string }).$version).toBe("2.0");
  });

  it("extended functions are bound to the store proxy", () => {
    let capturedStore: unknown;
    const s = createStore({ count: 0 }, {
      plugins: [{
        name: "p",
        onInit({ extend }) {
          extend({ $self(this: unknown) { capturedStore = this; } });
        },
      }],
    })();

    (s as unknown as { $self: () => void }).$self();
    expect(capturedStore).toBe(s);
  });

  it("multiple per-store plugins run in order", () => {
    const log: string[] = [];
    const s = createStore({ x: 0 }, {
      plugins: [
        { name: "a", onMutation() { log.push("a"); } },
        { name: "b", onMutation() { log.push("b"); } },
      ],
    })();

    (s as unknown as { x: number }).x = 1;
    expect(log).toEqual(["a", "b"]);
  });

  it("$subscribe, $reset, $patch, $state are NOT tracked as actions", () => {
    const actions: string[] = [];
    const s = createStore({ count: 0 }, {
      plugins: [{ name: "p", onAction({ name }) { actions.push(name); } }],
    })();

    (s as unknown as { $state: () => unknown }).$state();
    (s as unknown as { $patch: (p: Record<string, unknown>) => void }).$patch({ count: 1 });
    (s as unknown as { $reset: () => void }).$reset();
    expect(actions).toHaveLength(0);
  });

  it("no plugins — store behaves identically to baseline", () => {
    const s = createStore({ count: 0, increment() { (this as unknown as { count: number }).count++; } })();
    (s as unknown as { increment: () => void }).increment();
    expect(s.count).toBe(1);
  });
});

// ── createStore — global plugins ─────────────────────────────────────────────

describe("createStore — global plugins (useStorePlugin)", () => {
  it("global plugin fires for any store created after registration", () => {
    const storenames: string[] = [];
    useStorePlugin({ name: "g", onInit({ storeName }) { storenames.push(storeName); } });

    createStore({ x: 0 }, { name: "alpha" });
    createStore({ y: 0 }, { name: "beta" });
    expect(storenames).toEqual(["alpha", "beta"]);
  });

  it("global + per-store plugins both fire: global first", () => {
    const log: string[] = [];
    useStorePlugin({ name: "global", onMutation() { log.push("global"); } });

    const s = createStore({ x: 0 }, {
      plugins: [{ name: "local", onMutation() { log.push("local"); } }],
    })();

    (s as unknown as { x: number }).x = 1;
    expect(log).toEqual(["global", "local"]);
  });

  it("plugin registered after createStore does NOT receive events", () => {
    const mutations: number[] = [];
    const s = createStore({ x: 0 }, { name: "s" })();
    useStorePlugin({ name: "late", onMutation() { mutations.push(1); } });

    (s as unknown as { x: number }).x = 5;
    expect(mutations).toHaveLength(0);
  });
});

// ── class-based stores — per-store plugins ────────────────────────────────────

describe("@Storable({ plugins }) — per-store plugins", () => {
  it("onInit receives the class name as storeName", () => {
    let received = "";
    class SessionStore extends ReactiveStore { token = ""; }
    Storable({ plugins: [{ name: "p", onInit({ storeName }) { received = storeName; } }] })(
      SessionStore, {} as ClassDecoratorContext,
    );
    store(SessionStore);
    expect(received).toBe("SessionStore");
  });

  it("onMutation fires when a property is set on the singleton", () => {
    const mutations: StoreMutation[] = [];
    class FlagsStore extends ReactiveStore { enabled = false; }
    Storable({ plugins: [{ name: "p", onMutation(m) { mutations.push(m); } }] })(
      FlagsStore, {} as ClassDecoratorContext,
    );

    const s = store(FlagsStore);
    s.enabled = true;

    const m = mutations.find((x) => x.key === "enabled");
    expect(m?.value).toBe(true);
    expect(m?.prevValue).toBe(false);
    expect(m?.storeName).toBe("FlagsStore");
  });

  it("onAction and onActionDone fire for store methods", () => {
    const log: string[] = [];
    class CounterStore2 extends ReactiveStore {
      count = 0;
      increment() { this.count++; }
    }
    Storable({
      plugins: [{
        name: "p",
        onAction({ name }) { log.push(`before:${name}`); },
        onActionDone({ name }) { log.push(`done:${name}`); },
      }],
    })(CounterStore2, {} as ClassDecoratorContext);

    store(CounterStore2).increment();
    expect(log).toContain("before:increment");
    expect(log).toContain("done:increment");
  });

  it("onInit extend() — non-function value is returned directly", () => {
    class TagStore extends ReactiveStore {}
    Storable({ plugins: [{ name: "p", onInit({ extend }) { extend({ $tag: "ok" }); } }] })(
      TagStore, {} as ClassDecoratorContext,
    );

    expect((store(TagStore) as unknown as { $tag: string }).$tag).toBe("ok");
  });

  it("onInit extend() — function value is bound to the proxy", () => {
    let capturedThis: unknown;
    class SelfStore extends ReactiveStore {}
    Storable({
      plugins: [{
        name: "p",
        onInit({ extend }) {
          extend({ $self(this: unknown) { capturedThis = this; } });
        },
      }],
    })(SelfStore, {} as ClassDecoratorContext);

    const s = store(SelfStore);
    (s as unknown as { $self(): void }).$self();
    expect(capturedThis).toBe(s);
  });

  it("onMutation does NOT fire when Reflect.set returns false (non-writable property)", () => {
    const mutations: string[] = [];
    class ReadonlyStore extends ReactiveStore {
      get fixed() { return 42; }
    }
    Storable({ plugins: [{ name: "p", onMutation({ key }) { mutations.push(key); } }] })(
      ReadonlyStore, {} as ClassDecoratorContext,
    );

    const s = store(ReadonlyStore);
    // `fixed` has no setter — Reflect.set returns false, onMutation must NOT fire
    Reflect.set(s as object, "fixed", 99);
    expect(mutations).not.toContain("fixed");
  });

  it("$-prefixed methods are NOT tracked as actions", () => {
    const actions: string[] = [];
    class OpStore extends ReactiveStore {
      value = 0;
      $internal() { this.value = 1; }
    }
    Storable({ plugins: [{ name: "p", onAction({ name }) { actions.push(name); } }] })(
      OpStore, {} as ClassDecoratorContext,
    );
    store(OpStore).$internal();
    expect(actions).not.toContain("$internal");
  });

  it("onActionDone fires with resolved value for async methods (lines 30-35 in apply-plugins)", async () => {
    const results: StoreActionResult[] = [];
    class AsyncStore extends ReactiveStore {
      async fetch() { return 99; }
    }
    Storable({ plugins: [{ name: "p", onActionDone(r) { results.push(r); } }] })(
      AsyncStore, {} as ClassDecoratorContext,
    );

    await store(AsyncStore).fetch();
    expect(results[0].result).toBe(99);
    expect(results[0].error).toBeUndefined();
  });

  it("onActionDone fires with error when async method rejects (lines 36-39 in apply-plugins)", async () => {
    const results: StoreActionResult[] = [];
    const boom = new Error("async-fail");
    class FailStore extends ReactiveStore {
      async fail() { throw boom; }
    }
    Storable({ plugins: [{ name: "p", onActionDone(r) { results.push(r); } }] })(
      FailStore, {} as ClassDecoratorContext,
    );

    await expect(store(FailStore).fail()).rejects.toThrow("async-fail");
    expect(results[0].error).toBe(boom);
    expect(results[0].result).toBeUndefined();
  });

  it("setting a symbol key on the proxy is a no-op and returns true (lines 53-54 in apply-plugins)", () => {
    class SymStore extends ReactiveStore { value = 0; }
    Storable({ plugins: [{ name: "p", onMutation() { /* intentionally empty */ } }] })(
      SymStore, {} as ClassDecoratorContext,
    );

    const s = store(SymStore);
    const sym = Symbol("test");
    expect(() => {
      (s as unknown as Record<symbol, unknown>)[sym] = "ignored";
    }).not.toThrow();
    expect((s as unknown as Record<symbol, unknown>)[sym]).toBe("ignored");
  });

  it("no plugins — class-based store works identically to baseline", () => {
    class BareStore extends ReactiveStore { value = 7; }
    Storable()(BareStore, {} as ClassDecoratorContext);
    const s = store(BareStore);
    s.value = 42;
    expect(s.value).toBe(42);
  });
});

// ── class-based stores — global plugins ───────────────────────────────────────

describe("class-based store — global plugins", () => {
  it("global plugin fires for class-based stores", () => {
    const names: string[] = [];
    useStorePlugin({ name: "g", onInit({ storeName }) { names.push(storeName); } });

    class GlobalTestStore extends ReactiveStore {}
    Storable()(GlobalTestStore, {} as ClassDecoratorContext);
    store(GlobalTestStore);

    expect(names).toContain("GlobalTestStore");
  });

  it("global + per-store plugins both fire: global first", () => {
    const log: string[] = [];
    useStorePlugin({ name: "global", onMutation() { log.push("global"); } });

    class MixStore extends ReactiveStore { x = 0; }
    Storable({ plugins: [{ name: "local", onMutation() { log.push("local"); } }] })(
      MixStore, {} as ClassDecoratorContext,
    );

    store(MixStore).x = 1;
    expect(log).toEqual(["global", "local"]);
  });
});

// ── real-world plugin patterns ────────────────────────────────────────────────

describe("built-in plugin patterns", () => {
  it("logger plugin: records mutations and action calls", () => {
    const log: string[] = [];
    const logger: StorePlugin = {
      name: "logger",
      onMutation({ storeName, key, value }) {
        log.push(`[${storeName}] ${key} = ${JSON.stringify(value)}`);
      },
      onAction({ storeName, name }) {
        log.push(`[${storeName}] ${name}()`);
      },
    };

    const s = createStore({
      count: 0,
      increment() { (this as unknown as { count: number }).count++; },
    }, { name: "counter", plugins: [logger] })();

    (s as unknown as { increment: () => void }).increment();
    expect(log).toContain("[counter] increment()");
    expect(log).toContain('[counter] count = 1');
  });

  it("persistence plugin: restores state onInit and saves onMutation", () => {
    const storage: Record<string, unknown> = { count: 99 };
    let savedCount: unknown;

    const persistPlugin: StorePlugin = {
      name: "persist",
      onInit({ store: s, storeName }) {
        if (storeName === "counter" && typeof storage.count === "number") {
          (s as { count: number }).count = storage.count as number;
        }
      },
      onMutation({ key, value }) {
        if (key === "count") savedCount = value;
      },
    };

    const s = createStore({ count: 0 }, { name: "counter", plugins: [persistPlugin] })();
    expect((s as unknown as { count: number }).count).toBe(99);

    (s as unknown as { count: number }).count = 55;
    expect(savedCount).toBe(55);
  });

  it("spy plugin: action wrapping does not break return values", () => {
    const spy = vi.fn();
    const s = createStore(
      { double(n: unknown) { return (n as number) * 2; } },
      { plugins: [{ name: "spy", onActionDone({ name, result }) { spy(name, result); } }] },
    )();

    const result = (s as unknown as { double: (n: number) => number }).double(5);
    expect(result).toBe(10);
    expect(spy).toHaveBeenCalledWith("double", 10);
  });
});
