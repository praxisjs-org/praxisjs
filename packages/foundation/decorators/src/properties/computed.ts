import { ComputedNode, readComputed } from "@praxisjs/core/internal";

import { createGetterDecorator, type GetterDecorator } from "../create-getter-decorator";

export interface ComputedOptions {
  /**
   * Handles writes to the property. A `set` accessor declared next to the getter in the class
   * does the same, and TypeScript sees it.
   */
  set?(this: object, value: unknown): void;
}

type Host = Record<symbol, ComputedNode | undefined>;

// Kept out of the getter: a closure created inside it would make every read allocate a context.
function computedFor<T>(instance: T, getter: (this: T) => unknown): ComputedNode {
  return new ComputedNode(() => getter.call(instance));
}

/**
 * Caches a getter as a reactive computed. A `set` accessor declared next to the getter makes the
 * property writable.
 */
export function Computed(options?: ComputedOptions): GetterDecorator {
  // eslint-disable-next-line @typescript-eslint/unbound-method -- installed on the class, which calls it with the instance as `this`
  const set = options?.set;
  return createGetterDecorator<Host>({
    label: "@Computed()",
    setup(original, context) {
      const node = Symbol(`praxis.computed.${String(context.name)}`);
      return {
        // Shared by every instance; the computed itself is only created the first time it is read,
        // so a getter that a component never reads costs nothing beyond its slot.
        get(this: Host) {
          return readComputed((this[node] ??= computedFor(this, original)));
        },
        set,
        init(instance) {
          // The slot is created up front so every instance keeps the same shape.
          instance[node] = undefined;
        },
      };
    },
  }) as GetterDecorator;
}
