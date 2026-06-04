import {
  createFieldDecorator,
  type FieldBinding,
  type ReactiveHost,
} from "@praxisjs/decorators";

import { applyPluginsToStore } from "./apply-plugins.js";
import { getGlobalPlugins } from "./plugin-registry.js";

import type { StorePlugin } from "./plugin-types.js";

const storeRegistry = new Map<new (...args: unknown[]) => unknown, unknown>();
const storePluginsMap = new WeakMap<
  new (...args: unknown[]) => ReactiveStore,
  StorePlugin[]
>();

/** Base class for store classes. Extend this to enable `@State` and `@DeepState` on store fields. */
export class ReactiveStore implements ReactiveHost {
  _stateDirty = false;
}

export interface StorableOptions {
  plugins?: StorePlugin[];
}

export function Storable(options: StorableOptions = {}) {
  return function (
    constructor: new (...args: unknown[]) => ReactiveStore,
    _context: ClassDecoratorContext,
  ): void {
    storeRegistry.set(constructor, null);
    if (options.plugins?.length) {
      storePluginsMap.set(constructor, options.plugins);
    }
  };
}

export function store<T extends ReactiveStore>(StoreClass: new () => T): T {
  if (!storeRegistry.has(StoreClass) || storeRegistry.get(StoreClass) === null) {
    const instance = new StoreClass();
    const perStore =
      storePluginsMap.get(StoreClass as new (...args: unknown[]) => ReactiveStore) ?? [];
    const plugins = [...getGlobalPlugins(), ...perStore];
    const wrapped = applyPluginsToStore(instance, StoreClass.name, plugins);
    storeRegistry.set(StoreClass, wrapped);
  }
  return storeRegistry.get(StoreClass) as T;
}

export function Store(StoreConstructor: new () => unknown) {
  return createFieldDecorator({
    bind(_instance, _name, _initialValue): FieldBinding {
      return {
        descriptor: {
          get(this: object): unknown {
            return store(StoreConstructor as new () => ReactiveStore);
          },
        },
      };
    },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  }) as unknown as (_value: undefined, context: ClassFieldDecoratorContext<any>) => void;
}
