import type { StatefulComponent } from "@praxisjs/core";
import { computed } from "@praxisjs/core/internal";

export function Computed() {
  return function <This extends StatefulComponent, T>(
    target: (this: This) => T,
    _context: ClassGetterDecoratorContext<This, T>,
  ): (this: This) => T {
    const computedMap = new WeakMap<object, () => T>();

    return function (this: This): T {
      let c = computedMap.get(this);
      if (!c) {
        c = computed(() => target.call(this));
        computedMap.set(this, c);
      }
      return c();
    };
  };
}
