import { signal, computed } from "@praxisjs/core/internal";
import type { Computed } from "@praxisjs/shared";

import { acceptsSignal } from "./utils";

export interface PoolInstance<T> {
  (...args: unknown[]): Promise<T | undefined>;
  loading: Computed<boolean>;
  active: Computed<number>;
  pending: Computed<number>;
  error: Computed<Error | null>;
  cancelAll(): void;
}

function isAbortError(err: unknown): boolean {
  return err instanceof Error && err.name === "AbortError";
}

export function pool<T>(
  concurrency: number,
  fn: (...args: unknown[]) => Promise<T>,
  options?: { signal?: boolean },
): PoolInstance<T> {
  concurrency = Math.max(1, concurrency);
  const _active = signal(0);
  const _pending = signal(0);
  const _error = signal<Error | null>(null);
  const _wantsSignal = options?.signal ?? acceptsSignal(fn);
  const _queue: Array<{
    args: unknown[];
    resolve: (v: T | undefined) => void;
    controller: AbortController;
  }> = [];
  const _activeControllers = new Set<AbortController>();

  async function tryRun(): Promise<void> {
    if (_active() >= concurrency || _queue.length === 0) return;
    const item = _queue[0];
    _queue.shift();

    const { args, resolve, controller } = item;
    _pending.update((n) => n - 1);
    _active.update((n) => n + 1);
    _activeControllers.add(controller);
    try {
      const result = await (_wantsSignal ? fn(controller.signal, ...args) : fn(...args));
      resolve(result);
    } catch (err) {
      if (!isAbortError(err)) {
        _error.set(err instanceof Error ? err : new Error(String(err)));
      }
      resolve(undefined);
    } finally {
      _activeControllers.delete(controller);
      _active.update((n) => n - 1);
      void tryRun();
    }
  }

  function run(...args: unknown[]): Promise<T | undefined> {
    const controller = new AbortController();
    return new Promise<T | undefined>((resolve) => {
      _queue.push({ args, resolve, controller });
      _pending.update((n) => n + 1);
      void tryRun();
    });
  }

  run.loading = computed(() => _active() > 0);
  run.active = computed(() => _active());
  run.pending = computed(() => _pending());
  run.error = computed(() => _error());
  run.cancelAll = () => {
    for (const c of _activeControllers) {
      c.abort();
    }
    _activeControllers.clear();
    while (_queue.length > 0) {
      const item = _queue.shift();
      item?.controller.abort();
      item?.resolve(undefined);
    }
    _pending.set(0);
  };

  return run as PoolInstance<T>;
}
