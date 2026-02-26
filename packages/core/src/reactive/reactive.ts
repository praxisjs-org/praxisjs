import { Computed, signal, Signal } from "../signal";
import { effect } from "../signal/effect";

export function when<T>(
  source: Signal<T> | Computed<T> | (() => T),
  fn: (value: NonNullable<T>) => void,
) {
  const read = typeof source === "function" ? source : (source as () => T);
  let disposed = false;

  const stop = effect(() => {
    const value = read();
    if (!value || disposed) return;

    disposed = true;
    stop();
    fn(value as NonNullable<T>);
  });

  return stop;
}

export function until<T>(source: Signal<T> | Computed<T> | (() => T)) {
  return new Promise<NonNullable<T>>((resolve) => {
    const stop = when(source, (value) => {
      resolve(value);
    });

    void stop;
  });
}

export function debounced<T>(
  source: Signal<T> | Computed<T> | (() => T),
  ms: number,
) {
  const read = typeof source === "function" ? source : (source as () => T);
  const current = signal<T>(read());
  let timeout: ReturnType<typeof setTimeout> | undefined;

  effect(() => {
    const value = read();
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => {
      current.set(value);
      timeout = undefined;
    }, ms);
  });

  return current;
}
