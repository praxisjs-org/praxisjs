import type { Computed, Signal } from "@praxisjs/shared";

import { signal } from "../signal";
import { effect } from "../signal/effect";

export function when<T>(
  source: Signal<T> | Computed<T>,
  fn: (value: NonNullable<T>) => void,
) {
  let disposed = false;
  const ref = { cancel: undefined as (() => void) | undefined };

  const stop = effect(() => {
    const value = source();
    if (!value || disposed) return;

    disposed = true;
    ref.cancel?.();
    fn(value);
  });

  ref.cancel = stop;

  // If source was truthy on the first synchronous run, ref.cancel?.() above
  // was a no-op because it hadn't been assigned yet. Cancel the effect now.
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (disposed) stop();

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
