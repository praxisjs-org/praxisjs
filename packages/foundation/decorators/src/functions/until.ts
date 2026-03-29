import { until } from "@praxisjs/core/internal";
import type { Computed, Signal } from "@praxisjs/shared";
import { isComputed } from "@praxisjs/shared/internal";

import { createMethodDecorator } from "../create-method-decorator";

export function Until(propName: string) {
  return createMethodDecorator({
    wrap(_original, instance) {
      return () => {
        const raw = (instance as Record<string, unknown>)[propName];
        const source = isComputed(raw)
          ? (raw as Computed<unknown>)
          : (raw as Signal<unknown>);
        return until(source);
      };
    },
  });
}
