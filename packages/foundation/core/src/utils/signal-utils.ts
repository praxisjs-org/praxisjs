import { Computed, Signal } from "../signal";

// TODO: Migrage this to a separate package
export function isSignal<T>(
  source: Signal<T> | Computed<T> | (() => T),
): boolean {
  return typeof (source as Signal<T>).set === "function";
}
