import { signal, computed } from "@praxisjs/core/internal";
import type { Computed } from "@praxisjs/shared";

export interface PoolInstance<T> {
  (...args: unknown[]): Promise<T | undefined>;
  loading: Computed<boolean>;
  active: Computed<number>;
  pending: Computed<number>;
  error: Computed<Error | null>;
}

export function pool<T>(
  concurrency: number,
  fn: (...args: unknown[]) => Promise<T>,
): PoolInstance<T> {
  const _active = signal(0);
  const _pending = signal(0);
  const _error = signal<Error | null>(null);
  const _queue: Array<{
    args: unknown[];
    resolve: (v: T | undefined) => void;
  }> = [];

  async function tryRun(): Promise<void> {
    if (_active() >= concurrency || _queue.length === 0) return;
    const item = _queue.shift();
    if (!item) return;
    const { args, resolve } = item;
    _pending.update((n) => n - 1);
    _active.update((n) => n + 1);
    try {
      resolve(await fn(...args));
    } catch (err) {
      _error.set(err instanceof Error ? err : new Error(String(err)));
      resolve(undefined);
    } finally {
      _active.update((n) => n - 1);
      void tryRun();
    }
  }

  function run(...args: unknown[]): Promise<T | undefined> {
    return new Promise<T | undefined>((resolve) => {
      _queue.push({ args, resolve });
      _pending.update((n) => n + 1);
      void tryRun();
    });
  }

  run.loading = computed(() => _active() > 0);
  run.active = computed(() => _active());
  run.pending = computed(() => _pending());
  run.error = computed(() => _error());

  return run as PoolInstance<T>;
}
