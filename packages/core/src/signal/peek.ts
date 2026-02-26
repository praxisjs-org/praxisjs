import { Computed } from "./computed";
import { track, activeEffect, runEffect, type Effect } from "./effect";
import { Signal } from "./signal";

export function peek<T>(source: Signal<T> | Computed<T> | (() => T)): T {
  const prev = activeEffect;
  runEffect(null);
  try {
    return source();
  } finally {
    runEffect(prev);
  }
}
