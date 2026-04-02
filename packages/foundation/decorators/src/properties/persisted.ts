import { persistedSignal, type PersistedSignalOptions } from "@praxisjs/core/internal";
import type { Signal } from "@praxisjs/shared";

import { createFieldDecorator } from "../create-field-decorator";

const signalMap = new WeakMap<object, Map<string, Signal<unknown>>>();

function getOrCreateSignal<T>(
  instance: object,
  storageKey: string,
  initialValue: T,
  options: PersistedSignalOptions<T>,
): Signal<T> {
  if (!signalMap.has(instance)) signalMap.set(instance, new Map());
  const map = signalMap.get(instance) as Map<string, Signal<unknown>>;
  if (!map.has(storageKey)) {
    map.set(
      storageKey,
      persistedSignal(storageKey, initialValue, options) as Signal<unknown>,
    );
  }
  return map.get(storageKey) as Signal<T>;
}

export function Persisted<T>(
  key?: string,
  options: PersistedSignalOptions<T> = {},
) {
  return createFieldDecorator({
    bind(instance, name, initialValue) {
      const storageKey = key ?? name;
      getOrCreateSignal(instance, storageKey, initialValue as T, options);
      return {
        descriptor: {
          get: () =>
            getOrCreateSignal(instance, storageKey, undefined as T, options)(),
          set: (value: T) =>
            { getOrCreateSignal(instance, storageKey, undefined as T, options).set(value); },
        },
      };
    },
  });
}
