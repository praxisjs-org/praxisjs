import { pauseTracking, resumeTracking } from "@praxisjs/core/internal";

import type { StorePlugin } from "./plugin-types.js";

type Action = (...args: unknown[]) => unknown;

// `constructor` and the members every object inherits (`toString`, `hasOwnProperty`...) are not
// store actions: wrapping them would report them to plugins and break `new store.constructor()`.
function isBuiltin(prop: string, val: unknown): boolean {
  return prop === "constructor" || (Object.prototype as unknown as Record<string, unknown>)[prop] === val;
}

export function applyPluginsToStore<T extends object>(
  instance: T,
  storeName: string,
  plugins: StorePlugin[],
): T {
  if (plugins.length === 0) return instance;

  const actionPlugins = plugins.filter((p) => "onAction" in p || "onActionDone" in p);
  const mutationPlugins = plugins.filter((p) => "onMutation" in p);
  // Extensions are stored ready to return (functions already bound), so a read does no work.
  const extensions = new Map<string, unknown>();
  // One wrapper per method, so `store.action` keeps its identity across reads; rebuilt only when
  // the method itself is replaced.
  const wrappers = new Map<string, { fn: Action; wrapped: Action }>();

  function wrap(name: string, fn: Action): Action {
    if (actionPlugins.length === 0) {
      return (...args) => fn.apply(proxy, args);
    }
    return (...args) => {
      for (const p of actionPlugins) p.onAction?.({ name, args, storeName });
      const result = fn.apply(proxy, args);
      if (result instanceof Promise) {
        return result
          .then((resolved: unknown) => {
            for (const p of actionPlugins)
              p.onActionDone?.({ name, args, storeName, result: resolved });
            return resolved;
          })
          .catch((err: unknown) => {
            for (const p of actionPlugins)
              p.onActionDone?.({ name, args, storeName, result: undefined, error: err });
            throw err;
          });
      }
      for (const p of actionPlugins)
        p.onActionDone?.({ name, args, storeName, result });
      return result;
    };
  }

  const proxy: T = new Proxy(instance, {
    get(target, prop: string | symbol): unknown {
      if (typeof prop === "symbol") return Reflect.get(target, prop) as unknown;

      if (extensions.size > 0 && extensions.has(prop)) return extensions.get(prop);

      const val = Reflect.get(target, prop, proxy) as unknown;

      if (typeof val !== "function") return val;
      const cached = wrappers.get(prop);
      if (cached?.fn === val) return cached.wrapped;
      if (prop.startsWith("$") || isBuiltin(prop, val)) return val;
      const wrapped = wrap(prop, val as Action);
      wrappers.set(prop, { fn: val as Action, wrapped });
      return wrapped;
    },

    set(target, prop: string | symbol, value: unknown): boolean {
      if (typeof prop === "symbol") {
        (target as Record<symbol, unknown>)[prop] = value;
        return true;
      }
      if (mutationPlugins.length === 0) return Reflect.set(target, prop, value, proxy);
      // A write is not a read: assigning a field inside an effect must not subscribe the effect to
      // that field (through the previous value) or to whatever the plugins read.
      const prevSub = pauseTracking();
      try {
        const prevValue = Reflect.get(target, prop, proxy) as unknown;
        const ok: boolean = Reflect.set(target, prop, value, proxy);
        if (ok) {
          for (const p of mutationPlugins)
            p.onMutation?.({ key: prop, value, prevValue, storeName });
        }
        return ok;
      } finally {
        resumeTracking(prevSub);
      }
    },
  });

  for (const plugin of plugins) {
    plugin.onInit?.({
      store: proxy as unknown as Record<string, unknown>,
      storeName,
      extend(props) {
        for (const key of Object.keys(props)) {
          const ext = props[key];
          extensions.set(
            key,
            typeof ext === "function" ? (ext as Action).bind(proxy) : ext,
          );
        }
      },
    });
  }

  return proxy;
}
