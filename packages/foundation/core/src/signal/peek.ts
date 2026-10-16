import type { Computed, Signal } from "@praxisjs/shared";

import { untrack } from "./effect";

export function peek<T>(source: Signal<T> | Computed<T>): T {
  return untrack(source);
}
