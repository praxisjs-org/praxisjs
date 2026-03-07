import type { StatefulComponent } from "@praxisjs/core";
import {
  persistedSignal,
  type PersistedSignalOptions,
} from "@praxisjs/core/internal";
import type { Signal } from "@praxisjs/shared";

const signalMap = new WeakMap<object, Map<string, Signal<unknown>>>();
const initMap = new WeakMap<object, Set<string>>();

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
  return function (
    _value: undefined,
    context: ClassFieldDecoratorContext<StatefulComponent>,
  ): void {
    context.addInitializer(function (this: unknown) {
      const instance = this as object;
      const propertyKey = context.name as string;
      const storageKey = key ?? propertyKey;
      const initialValue = (instance as Record<string, unknown>)[
        propertyKey
      ] as T;

      Reflect.deleteProperty(instance, propertyKey);

      markInitialized(instance, propertyKey);
      getOrCreateSignal(instance, storageKey, initialValue, options);

      Object.defineProperty(instance, propertyKey, {
        get(): T {
          return getOrCreateSignal<T>(
            instance,
            storageKey,
            undefined as T,
            options,
          )();
        },

        set(value: T): void {
          getOrCreateSignal<T>(
            instance,
            storageKey,
            undefined as T,
            options,
          ).set(value);
        },

        enumerable: true,
        configurable: true,
      });
    });
  };
}
