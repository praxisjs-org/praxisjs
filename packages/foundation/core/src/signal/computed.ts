import type { Computed } from "@praxisjs/shared";

import { activeEffect, runEffect, type Effect } from "./effect";

export function computed<T>(computeFn: () => T): Computed<T> {
  let cachedValue: T;
  let dirty = true;
  const subscribers = new Set<Effect>();

  const recompute = () => {
    dirty = true;
    [...subscribers].forEach((sub) => {
      sub();
    });
  };

  function read() {
    if (activeEffect) {
      subscribers.add(activeEffect);
    }

    if (dirty) {
      const prevEffect = activeEffect;
      runEffect(recompute);
      cachedValue = computeFn();
      dirty = false;
      runEffect(prevEffect);
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
