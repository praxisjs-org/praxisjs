import { persistedSignal, type PersistedSignalOptions } from "@verbose/core";
import type { Signal } from "@verbose/shared";

const signalMap = new WeakMap<object, Map<string, Signal<unknown>>>();
const initMap = new WeakMap<object, Set<string>>();

function isInitialized(instance: object, propKey: string): boolean {
  return initMap.get(instance)?.has(propKey) ?? false;
}

function markInitialized(instance: object, propKey: string): void {
  if (!initMap.has(instance)) {
    initMap.set(instance, new Set());
  }
  (initMap.get(instance) as Set<string>).add(propKey);
}

function getOrCreateSignal<T>(
  instance: object,
  storageKey: string,
  initialValue: T,
  options: PersistedSignalOptions<T>,
): Signal<T> {
  if (!signalMap.has(instance)) {
    signalMap.set(instance, new Map());
  }
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
  return function (target: object, propertyKey: string): void {
    const storageKey = key ?? propertyKey;

    Object.defineProperty(target, propertyKey, {
      get(this: object): T {
        if (!isInitialized(this, propertyKey)) {
          return undefined as T;
        }

        return getOrCreateSignal<T>(
          this,
          storageKey,
          undefined as T,
          options,
        )();
      },

      set(this: object, value: T): void {
        if (!isInitialized(this, propertyKey)) {
          markInitialized(this, propertyKey);
          getOrCreateSignal(this, storageKey, value, options);
          return;
        }
        getOrCreateSignal<T>(this, storageKey, undefined as T, options).set(
          value,
        );
      },

      enumerable: true,
      configurable: true,
    });
  };
}
