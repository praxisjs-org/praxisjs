import { reactiveHostType, addClaimableInitializer, assertFieldContext } from "@praxisjs/decorators";

import { applyPluginsToStore } from "./apply-plugins.js";
import { getGlobalPlugins } from "./plugin-registry.js";

import type { StorePlugin } from "./plugin-types.js";

const storeRegistry = new Map<new (...args: unknown[]) => unknown, unknown>();
const storePluginsMap = new WeakMap<
  new (...args: unknown[]) => ReactiveStore,
  StorePlugin[]
>();

/** Base class for store classes. Extend this to enable `@State` and `@DeepState` on store fields. */
export class ReactiveStore {
  declare readonly [reactiveHostType]: true;
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
  const existing = storeRegistry.get(StoreClass);
  if (existing != null) return existing as T;
  const instance = new StoreClass();
  const perStore =
    storePluginsMap.get(StoreClass as new (...args: unknown[]) => ReactiveStore) ?? [];
  const plugins = [...getGlobalPlugins(), ...perStore];
  const wrapped = applyPluginsToStore(instance, StoreClass.name, plugins);
  storeRegistry.set(StoreClass, wrapped);
  return wrapped;
}

export function Store(StoreConstructor: new () => unknown) {
  // A store is a singleton that is never replaced, so the first lookup is kept for every later read.
  let cached: unknown;
  const descriptor: PropertyDescriptor = {
    get(): unknown {
      return (cached ??= store(StoreConstructor as new () => ReactiveStore));
    },
    enumerable: true,
    configurable: true,
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return function (_value: undefined, context: ClassFieldDecoratorContext<any>): void {
    assertFieldContext(context);
    const name = context.name;
    addClaimableInitializer(context, function () {
      Object.defineProperty(this, name, descriptor);
    });
  };
}
