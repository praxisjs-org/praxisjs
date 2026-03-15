import type { Signal } from "@praxisjs/shared";

import { signal } from "./signal";

export interface PersistedSignalOptions<T> {
  serialize?: (value: T) => string;
  deserialize?: (value: string) => T;
  syncTabs?: boolean;
}

export function persistedSignal<T>(
  key: string,
  initialValue: T,
  options: PersistedSignalOptions<T> = {},
) {
  const {
    serialize = JSON.stringify,
    deserialize = JSON.parse as (value: string) => T,
    syncTabs = true,
  } = options;

  function getStoredValue(): T {
    try {
      const stored = localStorage.getItem(key);
      return stored ? deserialize(stored) : initialValue;
    } catch (e) {
      console.warn(`Failed to deserialize value for key "${key}":`, e);
      return initialValue;
    }
  }

  function setStoredValue(value: T) {
    try {
      if (value === undefined || value === null) {
        localStorage.removeItem(key);
      } else {
        localStorage.setItem(key, serialize(value));
      }
    } catch (e) {
      console.warn(`Failed to serialize value for key "${key}":`, e);
    }
  }

  const inner = signal<T>(getStoredValue());

  function read() {
    return inner();
  }

  function set(value: T) {
    setStoredValue(value);
    inner.set(value);
  }

  function update(fh: (prev: T) => T) {
    const newValue = fh(inner());
    setStoredValue(newValue);
    inner.set(newValue);
  }

  if (syncTabs) {
    window.addEventListener("storage", (event) => {
      if (event.key !== key || event.storageArea !== localStorage) return;
      try {
        const newValue = event.newValue
          ? deserialize(event.newValue)
          : initialValue;
        inner.set(newValue);
      } catch (e) {
        console.warn(
          `Failed to deserialize value for key "${key}" from storage event:`,
          e,
        );
        inner.set(initialValue);
      }
    });
  }

  const source = read as Signal<T>;
  source.set = set;
  source.update = update;
  source.subscribe = inner.subscribe.bind(inner);
  source.__isSignal = true;

  return source;
}
