import {
  createEffect,
  disposeEffect,
  pauseTracking,
  readSignal,
  resumeTracking,
  type SignalNode,
} from "@praxisjs/core/internal";
import type { Computed } from "@praxisjs/shared";

const signalParams = new WeakMap<object, boolean>();

/**
 * Returns true if the function declares `signal` as its first parameter name.
 * Used to decide whether to inject an AbortSignal at call time.
 *
 * Works on unminified source (class methods, arrow functions, async functions).
 * Bound functions always return false — check the original method before binding.
 *
 * Cached per function: a decorated method is the same prototype function for every instance, and
 * reading its source on each construction was the main cost of creating a decorated component.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function acceptsSignal(fn: (...args: any[]) => any): boolean {
  let result = signalParams.get(fn);
  if (result === undefined) {
    result = readsSignalParam(fn);
    signalParams.set(fn, result);
  }
  return result;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function readsSignalParam(fn: (...args: any[]) => any): boolean {
  try {
    const src = fn.toString();
    // Match the first character of the parameter list, e.g.:
    //   async loadUser(signal, id)  →  "signal"
    //   (signal: AbortSignal) =>    →  "signal:"  (TS annotation stripped below)
    //   (id: number) =>             →  "id:"
    //   () =>                       →  ""
    const m = /\(\s*([^),\s]*)/.exec(src);
    const rawFirst = m?.[1] ?? "";
    const firstName = rawFirst.split(/[:=]/)[0].trim();
    return firstName === "signal";
  } catch {
    return false;
  }
}

/**
 * A read-only `Computed` view of a signal node: reading it tracks the node directly, without the
 * extra computed node, getter closure and recomputation a `computed(() => sig())` wrapper costs.
 */
export function readonlyView<T>(node: SignalNode<T>): Computed<T> {
  const view = (() => readSignal(node)) as Computed<T>;
  view.subscribe = (fn: (value: T) => void) => {
    const effect = createEffect(() => {
      const value = readSignal(node);
      const prev = pauseTracking();
      try {
        fn(value);
      } finally {
        resumeTracking(prev);
      }
    });
    return () => { disposeEffect(effect); };
  };
  view.__isComputed = true;
  return view;
}

export function isAbortError(err: unknown): boolean {
  return err instanceof Error && err.name === "AbortError";
}

export function toError(err: unknown): Error {
  return err instanceof Error ? err : new Error(String(err));
}
