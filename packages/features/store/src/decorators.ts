import type { RootComponent } from "@praxisjs/core/internal";
import {
  createClassDecorator,
  ClassBehavior,
  type ClassEnhancement,
  createFieldDecorator,
  type FieldBinding,
} from "@praxisjs/decorators";

const storeRegistry = new Map<new (...args: unknown[]) => unknown, unknown>();

class StoreBehavior extends ClassBehavior {
  create(_instance: RootComponent): ClassEnhancement {
    return {};
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  initialize(Enhanced: new (...args: any[]) => unknown): void {
    storeRegistry.set(Enhanced as new (...args: unknown[]) => unknown, null);
  }
}

const storeBehavior = new StoreBehavior();

export function Store() {
  const decorator = createClassDecorator(storeBehavior);
  // Store decorators work on any class, not just RootComponent
   
  return decorator as unknown as (value: new (...args: unknown[]) => unknown, context: ClassDecoratorContext) => new (...args: unknown[]) => unknown;
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
  // Store decorators work on any class, not just StatefulComponent
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  }) as unknown as (_value: undefined, context: ClassFieldDecoratorContext<any>) => void;
}
