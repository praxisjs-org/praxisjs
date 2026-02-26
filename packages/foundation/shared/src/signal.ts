import type { Computed, Signal } from "./types/signal";

export function isSignal<T>(
  source: Signal<T> | Computed<T> | (() => T),
): boolean {
  return typeof (source as Signal<T>).set === "function";
}

export function isComputed(source: unknown) {
  return typeof source === "function" && "subscribe" in source;
}
