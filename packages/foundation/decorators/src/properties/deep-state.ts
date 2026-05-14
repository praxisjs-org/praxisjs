import { signal } from "@praxisjs/core/internal";

import { createFieldDecorator } from "../create-field-decorator";

import type { ReactiveHost } from "../reactive-host";

function deepProxy<T extends object>(target: T, notify: () => void): T {
  return new Proxy(target, {
    get(obj, key, receiver) {
      const val: unknown = Reflect.get(obj, key, receiver);
      if (val !== null && typeof val === "object") {
        return deepProxy(val, notify);
      }
      return val;
    },
    set(obj, key, value) {
      const result = Reflect.set(obj, key, value);
      notify();
      return result;
    },
    deleteProperty(obj, key) {
      const result = Reflect.deleteProperty(obj, key);
      notify();
      return result;
    },
  });
}

export function DeepState() {
  return createFieldDecorator<ReactiveHost>({
    bind(instance, _name, initialValue) {
      const version = signal(0);
      let current = initialValue;
      let proxy =
        current !== null && typeof current === "object"
          ? deepProxy(current, notify)
          : current;

      function notify() {
        instance._stateDirty = true;
        version.update((v) => v + 1);
      }

      return {
        descriptor: {
          get() {
            version();
            return proxy;
          },
          set(value: unknown) {
            current = value;
            proxy =
              value !== null && typeof value === "object"
                ? deepProxy(value, notify)
                : value;
            notify();
          },
        },
      };
    },
  });
}
