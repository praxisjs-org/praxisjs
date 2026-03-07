import type { Computed, Signal } from "@praxisjs/shared";

import { activeEffect, runEffect } from "./effect";

export function peek<T>(source: Signal<T> | Computed<T>): T {
  const prev = activeEffect;
  runEffect(null);
  try {
    return source();
  } finally {
    runEffect(prev);
  }
}
