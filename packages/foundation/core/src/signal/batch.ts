import type { Effect } from "./effect";

const batchEffects: Effect[] = [];
let batchDepth = 0;

export function isBatching(): boolean {
  return batchDepth > 0;
}

export function enqueueEffect(effect: Effect): void {
  if (!batchEffects.includes(effect)) batchEffects.push(effect);
}

export function batch(fn: () => void) {
  batchDepth++;
  try {
    fn();
  } finally {
    if (--batchDepth === 0) {
      const n = batchEffects.length;
      for (let i = 0; i < n; i++) batchEffects[i]();
      batchEffects.length = 0;
    }
  }
}
