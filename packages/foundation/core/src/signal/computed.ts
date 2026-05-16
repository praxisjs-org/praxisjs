import type { Computed } from "@praxisjs/shared";

import { activeEffect, runEffect, type Effect } from "./effect";
import { addSub, removeSub, notifySubs, type SubList } from "./signal";

type ComputedRecompute = Effect & { __isComputedRecompute: true };

function isComputedRecompute(eff: Effect): boolean {
  return (eff as Partial<ComputedRecompute>).__isComputedRecompute === true;
}

export function computed<T>(getter: () => T): Computed<T> {
  let cachedValue: T | undefined;
  let dirty = true;

  const computedHolder = { subs: null as SubList };
  const leafHolder = { subs: null as SubList };
  let scheduled = false;

  let recompute: ComputedRecompute | null = null;

  function getRecompute(): ComputedRecompute {
    if (recompute !== null) return recompute;
    recompute = function markDirty(): void {
      if (dirty) return;
      dirty = true;
      if (computedHolder.subs !== null) notifySubs(computedHolder.subs, false);
      if (leafHolder.subs !== null && !scheduled) {
        scheduled = true;
        queueMicrotask(() => {
          scheduled = false;
          if (leafHolder.subs !== null) notifySubs(leafHolder.subs, false);
        });
      }
    } as ComputedRecompute;
    recompute.__isComputedRecompute = true;
    return recompute;
  }

  function read(): T {
    if (activeEffect !== null) {
      if (isComputedRecompute(activeEffect)) {
        addSub(computedHolder, activeEffect);
      } else {
        addSub(leafHolder, activeEffect);
      }
    }
    if (dirty) {
      const prevEffect = activeEffect;
      runEffect(getRecompute());
      try {
        cachedValue = getter();
        dirty = false;
      } finally {
        runEffect(prevEffect);
      }
    }
    return cachedValue as T;
  }

  const c = read as Computed<T>;

  c.subscribe = (fn: (value: T) => void) => {
    const wrapped: Effect = () => { fn(read()); };
    addSub(leafHolder, wrapped);
    wrapped();
    return () => { removeSub(leafHolder, wrapped); };
  };

  c.__isComputed = true;
  return c;
}
