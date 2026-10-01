import type { Effect } from "./effect";

const batchEffects = new Set<Effect>();
let batchDepth = 0;

export function isBatching(): boolean {
  return batchDepth > 0;
}

export function enqueueEffect(effect: Effect): void {
  batchEffects.add(effect);
}

export function batch(fn: () => void) {
  batchDepth++;
  try {
    fn();
  } finally {
    if (--batchDepth === 0) flush();
  }
}

// The queue is detached before running so a throwing effect can't leave stale entries behind,
// and every queued effect still runs — matching how notifySubs treats errors outside a batch.
function flush(): void {
  const queued = [...batchEffects];
  batchEffects.clear();
  let lastError: unknown;
  let hasError = false;
  for (const effect of queued) {
    try {
      effect();
    } catch (e) {
      lastError = e;
      hasError = true;
    }
  }
  if (hasError) throw lastError;
}
