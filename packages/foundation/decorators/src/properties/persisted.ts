import {
  persistedSignal,
  type PersistedSignal,
  type PersistedSignalOptions,
} from "@praxisjs/core/internal";

import { type FieldDecorator, type FieldHost, sharedField } from "../field";
import { addLifecycleHooks } from "../lifecycle";

// Fields of one instance that persist under the same key share one signal. Only read while the
// instance is built; each field then reads its signal from its own slot.
const SIGNALS: unique symbol = Symbol("praxis.persistedSignals");

interface PersistedHost {
  [SIGNALS]?: Map<string, PersistedSignal<unknown>>;
}

function getOrCreateSignal<T>(
  instance: PersistedHost,
  storageKey: string,
  initialValue: T,
  options: PersistedSignalOptions<T>,
): PersistedSignal<T> {
  const map = (instance[SIGNALS] ??= new Map<string, PersistedSignal<unknown>>());
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
): FieldDecorator {
  return sharedField((name) => {
    const slot = Symbol(`praxis.persisted.${name}`);
    const storageKey = key ?? name;
    // Without this every mounted instance would leave a window "storage" listener behind.
    const close = (instance: object) => { ((instance as FieldHost)[slot] as PersistedSignal<T>).close(); };
    return {
      descriptor: {
        get(this: FieldHost) {
          return (this[slot] as PersistedSignal<T>)();
        },
        set(this: FieldHost, value: T) {
          (this[slot] as PersistedSignal<T>).set(value);
        },
      },
      init(instance, initialValue) {
        instance[slot] = getOrCreateSignal(instance, storageKey, initialValue as T, options);
        addLifecycleHooks(instance, undefined, close);
      },
    };
  });
}
