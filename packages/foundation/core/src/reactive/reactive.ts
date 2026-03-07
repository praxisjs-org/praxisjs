import type { Computed, Signal } from "@praxisjs/shared";

import { signal } from "../signal";
import { effect } from "../signal/effect";

export function when<T>(
  source: Signal<T> | Computed<T>,
  fn: (value: NonNullable<T>) => void,
) {
  let disposed = false;

  const stop = effect(() => {
    const value = source();
    if (!value || disposed) return;

    disposed = true;
    stop();
    fn(value);
  });

  return stop;
}

export function until<T>(source: Signal<T> | Computed<T>) {
  return new Promise<NonNullable<T>>((resolve) => {
    const stop = when(source, (value) => {
      resolve(value);
    });

    void stop;
  });
}

export function debounced<T>(source: Signal<T> | Computed<T>, ms: number) {
  const current = signal<T>(source());
  let timeout: ReturnType<typeof setTimeout> | undefined;

  effect(() => {
    const value = source();
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => {
      current.set(value);
      timeout = undefined;
    }, ms);
  });

  return current;
}
