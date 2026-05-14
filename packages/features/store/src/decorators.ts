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

export function Store() {
  return function (
    constructor: new (...args: unknown[]) => ReactiveStore,
    _context: ClassDecoratorContext,
  ): void {
    storeRegistry.set(constructor, null);
  };
}

export function UseStore(StoreConstructor: new () => unknown) {
  const cache = new WeakMap<object, unknown>();

  return createFieldDecorator({
    bind(_instance, _name, _initialValue): FieldBinding {
      return {
        descriptor: {
          get(this: object): unknown {
            if (!cache.has(this)) {
              if (
                !storeRegistry.has(StoreConstructor) ||
                storeRegistry.get(StoreConstructor) === null
              ) {
                storeRegistry.set(StoreConstructor, new StoreConstructor());
              }
              cache.set(this, storeRegistry.get(StoreConstructor));
            }
            return cache.get(this);
          },
        },
      };
    },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  }) as unknown as (_value: undefined, context: ClassFieldDecoratorContext<any>) => void;
}
