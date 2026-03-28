import { when } from "@praxisjs/core/internal";
import type { Computed, Signal } from "@praxisjs/shared";
import { isComputed } from "@praxisjs/shared/internal";

import { createLifecycleMethodDecorator } from "../create-lifecycle-method-decorator";

export function When(propName: string) {
  return createLifecycleMethodDecorator({
    register(callback, instance) {
      const raw = (instance as unknown as Record<string, unknown>)[propName];
      const source = isComputed(raw)
        ? (raw as Computed<unknown>)
        : (raw as Signal<unknown>);
      return when(source, (val) => { callback(val); });
    },
  });
}
