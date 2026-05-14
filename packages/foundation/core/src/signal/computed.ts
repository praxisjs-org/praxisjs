import type { Computed } from "@praxisjs/shared";

import { activeEffect, runEffect, type Effect } from "./effect";

type ComputedRecompute = Effect & { __isComputedRecompute: true };

export function computed<T>(computeFn: () => T): Computed<T> {
  let cachedValue: T;
  let dirty = true;
  const subscribers = new Set<Effect>();
  let scheduled = false;

  const recompute: ComputedRecompute = Object.assign(
    () => {
      dirty = true;
      for (const sub of [...subscribers]) {
        if ((sub as Partial<ComputedRecompute>).__isComputedRecompute) {
          sub(); // propagate dirty synchronously through computed chain
        }
      }
      if (!scheduled) {
        scheduled = true;
        queueMicrotask(() => {
          scheduled = false;
          for (const sub of [...subscribers]) {
            if (!(sub as Partial<ComputedRecompute>).__isComputedRecompute) {
              sub(); // notify leaf effects (DOM, @Watch, subscribe)
            }
          }
        });
      }
    },
    { __isComputedRecompute: true as const },
  );

  function read() {
    if (activeEffect) {
      subscribers.add(activeEffect);
    }

    if (dirty) {
      const prevEffect = activeEffect;
      runEffect(recompute);
      try {
        cachedValue = computeFn();
        dirty = false;
      } finally {
        runEffect(prevEffect);
      }
    }

    return cachedValue;
  }

  function subscribe(fn: (value: T) => void) {
    const wrappedEffect = () => {
      fn(read());
    };
    subscribers.add(wrappedEffect);
    wrappedEffect();
    return () => subscribers.delete(wrappedEffect);
  }

  const computedSignal = read as Computed<T>;
  computedSignal.subscribe = subscribe;
  computedSignal.__isComputed = true;

  return computedSignal;
}
