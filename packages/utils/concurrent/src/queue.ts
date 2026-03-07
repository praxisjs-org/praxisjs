import { signal, computed } from "@praxisjs/core/internal";
import type { Computed } from "@praxisjs/shared";

export interface QueueInstance<T> {
  (...args: unknown[]): Promise<T>;
  loading: Computed<boolean>;
  pending: Computed<number>;
  error: Computed<Error | null>;
  clear(): void;
}

export function queue<T>(
  fn: (...args: unknown[]) => Promise<T>,
): QueueInstance<T> {
  const _loading = signal(false);
  const _pending = signal(0);
  const _error = signal<Error | null>(null);
  const _queue: Array<{
    args: unknown[];
    resolve: (v: T) => void;
    reject: (e: Error) => void;
  }> = [];
  let _running = false;
  let _cleared = false;

  async function drain(): Promise<void> {
    if (_running || _queue.length === 0) return;
    _running = true;
    _loading.set(true);
    while (_queue.length > 0 && !_cleared) {
      const item = _queue.shift();
      if (!item) break;
      const { args, resolve, reject } = item;
      _pending.update((n) => n - 1);
      try {
        resolve(await fn(...args));
      } catch (err) {
        const e = err instanceof Error ? err : new Error(String(err));
        _error.set(e);
        reject(e);
      }
    }
    _cleared = false;
    _running = false;
    _loading.set(false);
  }

  function enqueue(...args: unknown[]): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      _queue.push({ args, resolve, reject });
      _pending.update((n) => n + 1);
      void drain();
    });
  }

  enqueue.loading = computed(() => _loading());
  enqueue.pending = computed(() => _pending());
  enqueue.error = computed(() => _error());
  enqueue.clear = () => {
    _queue.length = 0;
    _pending.set(0);
    _cleared = true;
  };

  return enqueue as QueueInstance<T>;
}
