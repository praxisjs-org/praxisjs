import { computed } from "@praxisjs/core/internal";

import { createAccessorDecorator } from "../create-accessor-decorator";
import { createWritableGetterDecorator } from "../create-getter-decorator";

export interface ComputedOptions<T = unknown> {
  get?: (this: object) => T;
  set?: (this: object, value: T) => void;
}

// Accessor form — @Computed({ get, set }) on an `accessor` field.
// TypeScript sees the accessor as writable; no cast needed when assigning.
// The `Owner` generic is inferred from the `this` type of the provided functions.
export function Computed<T, Owner extends object = object>(options: {
  get: (this: Owner) => T;
  set: (this: Owner, value: T) => void;
}): <This extends object>(
  target: ClassAccessorDecoratorTarget<This, T>,
  context: ClassAccessorDecoratorContext<This, T>,
) => ClassAccessorDecoratorResult<This, T>;

// Getter form — @Computed() or @Computed({ set }) on a `get` accessor.
export function Computed(options?: {
  set?: (this: object, value: unknown) => void;
}): <This, R>(
  target: (this: This) => R,
  context: ClassGetterDecoratorContext<This, R>,
) => (this: This) => R;

export function Computed<T = unknown>(options?: ComputedOptions<T>): unknown {
  const optionsGet = options?.get as ((this: object) => unknown) | undefined;
  const optionsSet = options?.set as ((this: object, value: unknown) => void) | undefined;

  if (optionsGet) {
    return createAccessorDecorator({
      bind(instance, _name, _initialValue) {
        const c = computed(() => optionsGet.call(instance));
        return {
          get: c,
          set: optionsSet ? (value) => { optionsSet.call(instance, value); } : undefined,
        };
      },
    });
  }

  return createWritableGetterDecorator({
    bind(instance, _name, original) {
      const c = computed(() => original.call(instance));
      return {
        get: c,
        set: optionsSet ? (value) => { optionsSet.call(instance, value); } : undefined,
      };
    },
  });
}
