import {
  persistedSignal,
  type PersistedSignal,
  type PersistedSignalOptions,
} from "@praxisjs/core/internal";

import { createFieldDecorator } from "../create-field-decorator";

const signalMap = new WeakMap<object, Map<string, PersistedSignal<unknown>>>();

function getOrCreateSignal<T>(
  instance: object,
  storageKey: string,
  initialValue: T,
  options: PersistedSignalOptions<T>,
): PersistedSignal<T> {
  let map = signalMap.get(instance);
  if (!map) {
    map = new Map();
    signalMap.set(instance, map);
  }
  let sig = map.get(storageKey);
  if (!sig) {
    sig = persistedSignal(storageKey, initialValue, options) as PersistedSignal<unknown>;
    map.set(storageKey, sig);
  }
  return sig as PersistedSignal<T>;
}

export function Persisted<T>(
  key?: string,
  options: PersistedSignalOptions<T> = {},
) {
  return createFieldDecorator({
    bind(instance, name, initialValue) {
      const sig = getOrCreateSignal(instance, key ?? name, initialValue as T, options);
      return {
        descriptor: {
          get: () => sig(),
          set: (value: T) => { sig.set(value); },
        },
        // Without this every mounted instance would leave a window "storage" listener behind.
        onUnmount() { sig.close(); },
      };
    },
  });
}
