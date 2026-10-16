import { describe, it, expect, beforeEach, vi } from "vitest";

import { effect, signal } from "@praxisjs/core/internal";
import { State } from "@praxisjs/decorators";

import { clearPlugins, useStorePlugin } from "../plugin-registry";
import { Storable, store, ReactiveStore } from "../decorators";
import type { StorePlugin, StoreMutation, StoreActionResult } from "../plugin-types";

// Isolate global plugins between tests
beforeEach(() => clearPlugins());

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

    @Storable({ plugins: [logger] })
    class LoggedCounter extends ReactiveStore {
      @State() count = 0;
      increment() { this.count++; }
    }

    store(LoggedCounter).increment();
    expect(log).toContain("[LoggedCounter] increment()");
    expect(log).toContain("[LoggedCounter] count = 1");
  });

  it("persistence plugin: restores state onInit and saves onMutation", () => {
    const storage: Record<string, unknown> = { count: 99 };
    let savedCount: unknown;

    const persistPlugin: StorePlugin = {
      name: "persist",
      onInit({ store: s, storeName }) {
        if (storeName === "PersistedCounter" && typeof storage.count === "number") {
          (s as { count: number }).count = storage.count;
        }
      },
      onMutation({ key, value }) {
        if (key === "count") savedCount = value;
      },
    };

    @Storable({ plugins: [persistPlugin] })
    class PersistedCounter extends ReactiveStore {
      @State() count = 0;
    }

    const s = store(PersistedCounter);
    expect(s.count).toBe(99);
    s.count = 55;
    expect(savedCount).toBe(55);
  });

  it("spy plugin: action wrapping does not break return values", () => {
    const spy = vi.fn();

    @Storable({ plugins: [{ name: "spy", onActionDone({ name, result }) { spy(name, result); } }] })
    class Doubler extends ReactiveStore {
      double(n: number) { return n * 2; }
    }

    expect(store(Doubler).double(5)).toBe(10);
    expect(spy).toHaveBeenCalledWith("double", 10);
  });
});

describe("class-based store proxy — identity and tracking", () => {
  it("returns the same wrapped action on every read", () => {
    class IdStore extends ReactiveStore {
      n = 0;
      bump() { this.n++; }
    }
    Storable({ plugins: [{ name: "p", onAction() {} }] })(IdStore, {} as ClassDecoratorContext);
    const s = store(IdStore);
    expect(s.bump).toBe(s.bump);
    s.bump();
    expect(s.n).toBe(1);
  });

  it("wraps a method again when it is replaced on the instance", () => {
    const actions: string[] = [];
    class SwapStore extends ReactiveStore {
      run() { return 1; }
    }
    Storable({ plugins: [{ name: "p", onAction({ name }) { actions.push(name); } }] })(
      SwapStore, {} as ClassDecoratorContext,
    );
    const s = store(SwapStore);
    const first = s.run;
    s.run = () => 2;
    expect(s.run).not.toBe(first);
    expect(s.run()).toBe(2);
    expect(actions).toEqual(["run"]);
  });

  it("returns the same bound extension on every read", () => {
    class ExtStore extends ReactiveStore {}
    Storable({
      plugins: [{ name: "p", onInit({ extend }) { extend({ $hello() { return "hi"; } }); } }],
    })(ExtStore, {} as ClassDecoratorContext);
    const s = store(ExtStore) as unknown as { $hello(): string };
    expect(s.$hello).toBe(s.$hello);
    expect(s.$hello()).toBe("hi");
  });

  it("binds methods to the store when no plugin observes actions", () => {
    const keys: string[] = [];
    class PlainStore extends ReactiveStore {
      n = 0;
      bump() { this.n++; }
    }
    Storable({ plugins: [{ name: "p", onMutation({ key }) { keys.push(key); } }] })(
      PlainStore, {} as ClassDecoratorContext,
    );
    const s = store(PlainStore);
    const { bump } = s;
    bump();
    expect(s.n).toBe(1);
    expect(keys).toEqual(["n"]);
    expect(s.bump).toBe(bump);
  });

  it("extensions do not shadow inherited object members", () => {
    class ProtoStore extends ReactiveStore {}
    Storable({ plugins: [{ name: "p", onInit({ extend }) { extend({ $x: 1 }); } }] })(
      ProtoStore, {} as ClassDecoratorContext,
    );
    const s = store(ProtoStore);
    expect(s.constructor).toBe(ProtoStore);
    expect(s.toString).toBe(Object.prototype.toString);
  });

  it("writing a field inside an effect does not subscribe the effect to it", () => {
    const mutations: unknown[] = [];
    class TrackStore extends ReactiveStore {
      @State() value = 0;
    }
    Storable({ plugins: [{ name: "p", onMutation({ prevValue }) { mutations.push(prevValue); } }] })(
      TrackStore, {} as ClassDecoratorContext,
    );
    const s = store(TrackStore);
    const source = signal(1);
    let runs = 0;
    const stop = effect(() => {
      runs++;
      s.value = source();
    });
    s.value = 99;
    expect(runs).toBe(1);
    expect(s.value).toBe(99);
    expect(mutations).toEqual([0, 1]);
    source.set(2);
    expect(runs).toBe(2);
    stop();
  });
});
