import { computed, Computed, signal, Signal } from "../signal";
import { effect } from "../signal/effect";
import { isSignal } from "../utils/signal-utils";

export interface History<T> {
  readonly values: Computed<T[]>;
  readonly current: Computed<T>;
  readonly canUndo: Computed<boolean>;
  readonly canRedo: Computed<boolean>;
  undo(): void;
  redo(): void;
  clear(): void;
}

export function history<T>(
  source: Signal<T> | Computed<T> | (() => T),
  limit = 50,
) {
  const read = typeof source === "function" ? source : (source as () => T);

  const _past = signal<T[]>([]);
  const _future = signal<T[]>([]);
  const _current = signal<T>(read());

  let _ignoreNext = false;

  effect(() => {
    const value = read();

    if (_ignoreNext) {
      _ignoreNext = false;
      return;
    }

    const past = _past();
    const next = [...past, _current()];
    _past.set(next.length > limit ? next.slice(next.length - limit) : next);
    _future.set([]);
    _current.set(value);
  });

  return {
    values: computed(() => [..._past(), _current()]),
    current: computed(() => _current()),
    canUndo: computed(() => _past().length > 0),
    canRedo: computed(() => _future().length > 0),
    undo(): void {
      const past = _past();
      if (past.length === 0) return;

      const previous = past[past.length - 1];
      _past.set(past.slice(0, past.length - 1));
      _future.set([_current(), ..._future()]);
      _ignoreNext = true;
      _current.set(previous);

      if (isSignal(source)) {
        (source as Signal<T>).set(previous);
      }
    },
    redo(): void {
      const future = _future();
      if (future.length === 0) return;

      const next = future[0];
      _future.set(future.slice(1));
      _past.set([..._past(), _current()]);
      _ignoreNext = true;
      _current.set(next);

      if (isSignal(source)) {
        (source as Signal<T>).set(next);
      }
    },
    clear(): void {
      _past.set([]);
      _future.set([]);
    },
  };
}
