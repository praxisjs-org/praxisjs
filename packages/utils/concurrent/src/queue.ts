import { signal, computed } from "@praxisjs/core/internal";
import type { Computed } from "@praxisjs/shared";

import { acceptsSignal } from "./utils";

export class QueueClearedError extends Error {
  constructor() {
    super("Queue cleared");
    this.name = "QueueClearedError";
  }
}

function isAbortError(err: unknown): boolean {
  return err instanceof Error && err.name === "AbortError";
}

export interface QueueInstance<T> {
  (...args: unknown[]): Promise<T>;
  loading: Computed<boolean>;
  pending: Computed<number>;
  error: Computed<Error | null>;
  clear(): void;
}

export function queue<T>(
  fn: (...args: unknown[]) => Promise<T>,
  options?: { signal?: boolean },
): QueueInstance<T> {
  const _loading = signal(false);
  const _pending = signal(0);
  const _error = signal<Error | null>(null);
  const _wantsSignal = options?.signal ?? acceptsSignal(fn);
  const _queue: Array<{
    args: unknown[];
    resolve: (v: T) => void;
    reject: (e: Error) => void;
    controller: AbortController;
  }> = [];
  let _running = false;
  let _cleared = false;
  let _activeController: AbortController | null = null;
  let _activeAbortedByClear = false;

  async function drain(): Promise<void> {
    if (_running || _queue.length === 0) return;
    _running = true;
    _loading.set(true);
    while (_queue.length > 0) {
      const item = _queue[0];
      _queue.shift();

      const { args, resolve, reject, controller } = item;
      _activeController = controller;
      _activeAbortedByClear = false;
      _pending.update((n) => n - 1);
      try {
        const result = await (_wantsSignal ? fn(controller.signal, ...args) : fn(...args));
        resolve(result);
      } catch (err) {
        // _activeAbortedByClear is set asynchronously by clear() between the await and this catch
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        if (isAbortError(err) && _activeAbortedByClear) {
          reject(new QueueClearedError());
        } else {
          const e = err instanceof Error ? err : new Error(String(err));
          _error.set(e);
          reject(e);
        }
      } finally {
        _activeController = null;
      }
    }
    _cleared = false;
    _running = false;
    _loading.set(false);
  }

  function enqueue(...args: unknown[]): Promise<T> {
    if (_cleared) {
      _cleared = false;
    }
    const controller = new AbortController();
    return new Promise<T>((resolve, reject) => {
      _queue.push({ args, resolve, reject, controller });
      _pending.update((n) => n + 1);
      void drain();
    });
  }

  enqueue.loading = computed(() => _loading());
  enqueue.pending = computed(() => _pending());
  enqueue.error = computed(() => _error());
  enqueue.clear = () => {
    if (_activeController) {
      _activeAbortedByClear = true;
      _activeController.abort();
    }
    while (_queue.length > 0) {
      const item = _queue.shift();
      item?.controller.abort();
      item?.reject(new QueueClearedError());
    }
    _pending.set(0);
    _cleared = true;
  };

  return enqueue as QueueInstance<T>;
}
