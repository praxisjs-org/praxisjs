import type { StorePlugin } from "./plugin-types.js";

export function applyPluginsToStore<T extends object>(
  instance: T,
  storeName: string,
  plugins: StorePlugin[],
): T {
  if (plugins.length === 0) return instance;

  const extensions: Record<string, unknown> = {};

  const proxy: T = new Proxy(instance, {
    get(target, prop: string | symbol): unknown {
      if (typeof prop === "symbol") return Reflect.get(target, prop) as unknown;

      if (prop in extensions) {
        const ext = extensions[prop];
        return typeof ext === "function"
          ? (ext as (...a: unknown[]) => unknown).bind(proxy)
          : ext;
      }

      const val = Reflect.get(target, prop, proxy) as unknown;

      if (typeof val === "function" && !prop.startsWith("$")) {
        return (...args: unknown[]): unknown => {
          for (const p of plugins) p.onAction?.({ name: prop, args, storeName });
          const result = (val as (...a: unknown[]) => unknown).apply(proxy, args);
          if (result instanceof Promise) {
            return result
              .then((resolved: unknown) => {
                for (const p of plugins)
                  p.onActionDone?.({ name: prop, args, storeName, result: resolved });
                return resolved;
              })
              .catch((err: unknown) => {
                for (const p of plugins)
                  p.onActionDone?.({ name: prop, args, storeName, result: undefined, error: err });
                throw err;
              });
          }
          for (const p of plugins)
            p.onActionDone?.({ name: prop, args, storeName, result });
          return result;
        };
      }

      return val;
    },

    set(target, prop: string | symbol, value: unknown): boolean {
      if (typeof prop === "symbol") {
        (target as Record<symbol, unknown>)[prop] = value;
        return true;
      }
      const prevValue = Reflect.get(target, prop, proxy) as unknown;
      const ok: boolean = Reflect.set(target, prop, value, proxy);
      if (ok) {
        for (const p of plugins)
          p.onMutation?.({ key: prop, value, prevValue, storeName });
      }
      return ok;
    },
  });

  for (const plugin of plugins) {
    plugin.onInit?.({
      store: proxy as unknown as Record<string, unknown>,
      storeName,
      extend(props) {
        Object.assign(extensions, props);
      },
    });
  }

  return proxy;
}
