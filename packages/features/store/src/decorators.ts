import {
  createFieldDecorator,
  type FieldBinding,
  type ReactiveHost,
} from "@praxisjs/decorators";

const storeRegistry = new Map<new (...args: unknown[]) => unknown, unknown>();

/** Base class for store classes. Extend this to enable `@State` and `@DeepState` on store fields. */
export class ReactiveStore implements ReactiveHost {
  _stateDirty = false;
}

export function Storable() {
  return function (
    constructor: new (...args: unknown[]) => ReactiveStore,
    _context: ClassDecoratorContext,
  ): void {
    storeRegistry.set(constructor, null);
  };
}

export function store<T extends ReactiveStore>(StoreClass: new () => T): T {
  if (!storeRegistry.has(StoreClass) || storeRegistry.get(StoreClass) === null) {
    storeRegistry.set(StoreClass, new StoreClass());
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
