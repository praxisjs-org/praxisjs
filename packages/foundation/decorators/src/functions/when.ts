import { effect } from "@praxisjs/core/internal";
import type { Computed, Signal } from "@praxisjs/shared";
import { isComputed, isSignal } from "@praxisjs/shared/internal";

import { createLifecycleMethodDecorator } from "../create-lifecycle-method-decorator";

/** Read the current value of a property, unwrapping Signal or Computed if needed. */
function readProp(instance: Record<string, unknown>, key: string): unknown {
  const raw = instance[key];
  if (isComputed(raw)) return (raw as Computed<unknown>)();
  if (isSignal(raw))   return (raw as Signal<unknown>)();
  return raw;
}

export function When<T = unknown>(
  propName: string,
  condition?: (value: NonNullable<T>) => boolean,
) {
  return createLifecycleMethodDecorator({
    register(callback, instance) {
      const inst = instance as unknown as Record<string, unknown>;
      let fired = false;

      return effect(() => {
        if (fired) return;
        // Reading via readProp subscribes this effect to the underlying signal,
        // whether the property is a raw Signal/Computed or an @State getter.
        const val = readProp(inst, propName) as T;

        const meetsCondition = condition
          ? val != null && condition(val)
          : val != null && Boolean(val);

        if (meetsCondition) {
          fired = true;
          callback(val as NonNullable<T>);
        }
      });
    },
  });
}
