import { signal, effect } from "@praxisjs/core/internal";

import { getGlobalPlugins } from "./plugin-registry.js";

import type { StorePlugin } from "./plugin-types.js";

export interface CreateStoreOptions {
  name?: string;
  plugins?: StorePlugin[];
}

export function createStore<T extends Record<string, unknown>>(
  definition: T & ThisType<T>,
  options: CreateStoreOptions = {},
) {
  const storeName = options.name ?? "anonymous";
  const initialState: Record<string, unknown> = {};
  const methods: Record<string, (...args: unknown[]) => unknown> = {};

  for (const [key, value] of Object.entries(definition)) {
    if (typeof value === "function")
      methods[key] = value as (...args: unknown[]) => unknown;
    else initialState[key] = value;
  }

  const signals: Record<string, ReturnType<typeof signal>> = {};
  for (const [key, value] of Object.entries(initialState)) {
    signals[key] = signal(value);
  }

  const activePlugins = [...getGlobalPlugins(), ...(options.plugins ?? [])];
  const extensions: Record<string, unknown> = {};

  const store = new Proxy({} as T, {
    get(_t, key: string | symbol) {
      if (typeof key !== "string") return undefined;
      if (key in extensions) {
        const ext = extensions[key];
        return typeof ext === "function"
          ? (ext as (...a: unknown[]) => unknown).bind(store)
          : ext;
      }
      if (key in methods) {
        return (...args: unknown[]): unknown => {
          for (const p of activePlugins) p.onAction?.({ name: key, args, storeName });
          const result = methods[key].call(store, ...args);
          if (result instanceof Promise) {
            return result
              .then((resolved: unknown) => {
                for (const p of activePlugins)
                  p.onActionDone?.({ name: key, args, storeName, result: resolved });
                return resolved;
              })
              .catch((err: unknown) => {
                for (const p of activePlugins)
                  p.onActionDone?.({ name: key, args, storeName, result: undefined, error: err });
                throw err;
              });
          }
          for (const p of activePlugins)
            p.onActionDone?.({ name: key, args, storeName, result });
          return result;
        };
      }
      if (key === "$subscribe") return subscribe;
      if (key === "$reset") return reset;
      if (key === "$patch") return patch;
      if (key === "$state") return getState;
      if (key in signals) return signals[key]();
      const desc = Object.getOwnPropertyDescriptor(definition, key);
      if (desc?.get) return desc.get.call(store) as unknown;
      return undefined;
    },
    set(_t, key: string | symbol, value: unknown) {
      if (typeof key !== "string") return true;
      if (key in signals) {
        const prevValue = signals[key]();
        signals[key].set(value);
        for (const p of activePlugins)
          p.onMutation?.({ key, value, prevValue, storeName });
        return true;
      }
      return false;
    },
  });

  for (const plugin of activePlugins) {
    plugin.onInit?.({
      store: store as unknown as Record<string, unknown>,
      storeName,
      extend(props) {
        Object.assign(extensions, props);
      },
    });
  }

  function getState(): Record<string, unknown> {
    const s: Record<string, unknown> = {};
    for (const k of Object.keys(signals)) s[k] = signals[k]();
    return s;
  }

  function subscribe(fn: (state: Record<string, unknown>) => void): () => void {
    return effect(() => {
      fn(getState());
    });
  }

  function reset(): void {
    for (const [k, v] of Object.entries(initialState)) signals[k].set(v);
  }

  function patch(partial: Partial<Record<string, unknown>>): void {
    for (const [k, v] of Object.entries(partial)) {
      if (v === undefined) continue;
      if (k in signals) Reflect.set(store as object, k, v);
    }
  }

  return () => store;
}
