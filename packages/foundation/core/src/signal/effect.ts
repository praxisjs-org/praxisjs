import { activeSub, createEffect, disposeEffect, setActiveSub, type EffectCleanup } from "./graph";

export type Effect = () => void;

export function untrack<T>(fn: () => T): T {
  if (activeSub === undefined) return fn();
  const prev = setActiveSub(undefined);
  try {
    return fn();
  } finally {
    setActiveSub(prev);
  }
}

/**
 * Runs `fn` now and again whenever a signal or computed it read changes. A returned function is
 * called before each re-run and on stop. Returns the stop function.
 */
export function effect(fn: () => EffectCleanup): () => void {
  const node = createEffect(fn);
  return () => { disposeEffect(node); };
}
