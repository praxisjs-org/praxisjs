import type { StatefulComponent } from "@praxisjs/core";

import { createMethodDecorator } from "../create-method-decorator";

export function Debounce(ms: number) {
  return createMethodDecorator({
    wrap(original, instance, _name) {
      let timer: ReturnType<typeof setTimeout> | undefined;

      const comp = instance as StatefulComponent;
      const prevUnmount = comp.onUnmount?.bind(comp);
      comp.onUnmount = function (this: StatefulComponent) {
        prevUnmount?.call(this);
        if (timer !== undefined) {
          clearTimeout(timer);
          timer = undefined;
        }
      };

      return (...args: unknown[]) => {
        if (timer !== undefined) clearTimeout(timer);
        timer = setTimeout(() => {
          timer = undefined;
          original.apply(instance, args);
        }, ms);
      };
    },
  });
}
