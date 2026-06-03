import { computed } from "@praxisjs/core/internal";

export interface ComputedOptions<T = unknown> {
  set?: (value: T) => void;
}

export function Computed<T = unknown>(options?: ComputedOptions<T>) {
  const cache = new WeakMap<object, () => unknown>();
  const setter = options?.set as ((value: unknown) => void) | undefined;

  function getOrCreate(target: (this: object) => unknown, instance: object): () => unknown {
    let c = cache.get(instance);
    if (!c) {
      c = computed(() => target.call(instance));
      cache.set(instance, c);
    }
    return c;
  }

  return function <This, R>(
    target: (this: This) => R,
    context: ClassGetterDecoratorContext<This, R>,
  ): (this: This) => R {
    if (setter) {
      context.addInitializer(function (this: unknown) {
        Object.defineProperty(this, context.name, {
          get() { return getOrCreate(target as (this: object) => unknown, this as object)(); },
          set(value: unknown) { setter.call(this, value); },
          configurable: true,
          enumerable: false,
        });
      });
    }

    return function (this: This): R {
      return getOrCreate(target as (this: object) => unknown, this as object)() as R;
    };
  };
}
