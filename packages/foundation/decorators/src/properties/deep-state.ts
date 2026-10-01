import { markStateDirty, signal } from "@praxisjs/core/internal";

import { createFieldDecorator } from "../create-field-decorator";

import type { ReactiveHost } from "../reactive-host";

// One proxy per raw object: repeated reads return the same reference (so `a.b === a.b` and
// identity comparisons in effects hold) and don't allocate a new Proxy on every access.
function deepProxy<T extends object>(
  target: T,
  notify: () => void,
  cache: WeakMap<object, object>,
): T {
  const existing = cache.get(target);
  if (existing) return existing as T;

  const proxy = new Proxy(target, {
    get(obj, key, receiver) {
      const val: unknown = Reflect.get(obj, key, receiver);
      if (val !== null && typeof val === "object") {
        return deepProxy(val, notify, cache);
      }
      return val;
    },
    set(obj, key, value) {
      const had = Object.hasOwn(obj, key);
      const prev: unknown = Reflect.get(obj, key);
      const result = Reflect.set(obj, key, value);
      if (!had || !Object.is(prev, value)) notify();
      return result;
    },
    deleteProperty(obj, key) {
      const had = Object.hasOwn(obj, key);
      const result = Reflect.deleteProperty(obj, key);
      if (had) notify();
      return result;
    },
  });
  cache.set(target, proxy);
  return proxy;
}

export function DeepState() {
  return createFieldDecorator<ReactiveHost>({
    bind(instance, _name, initialValue) {
      const version = signal(0);
      const cache = new WeakMap<object, object>();
      let proxy =
        initialValue !== null && typeof initialValue === "object"
          ? deepProxy(initialValue, notify, cache)
          : initialValue;

      function notify() {
        markStateDirty(instance);
        version.update((v) => v + 1);
      }

      return {
        descriptor: {
          get() {
            version();
            return proxy;
          },
          set(value: unknown) {
            proxy =
              value !== null && typeof value === "object"
                ? deepProxy(value, notify, cache)
                : value;
            notify();
          },
        },
      };
    },
  });
}
