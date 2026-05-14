import type { Effect } from "./effect";

let batchQueue: Set<Effect> | null = null;

export function isBatching(): boolean {
  return batchQueue !== null;
}

export function enqueueEffect(effect: Effect): void {
  batchQueue?.add(effect);
}

export function batch(fn: () => void) {
  const isOuter = batchQueue === null;
  if (isOuter) {
    batchQueue = new Set();
  }
  try {
    fn();
  } finally {
    if (isOuter && batchQueue) {
      const effectsToRun = batchQueue;
      batchQueue = null;
      effectsToRun.forEach((eff) => {
        eff();
      });
    }
  }
}
