import { signal, computed } from "@praxisjs/core/internal";
import type { Computed } from "@praxisjs/shared";

import { acceptsSignal } from "./utils";

export interface TaskInstance<T> {
  (...args: unknown[]): Promise<T | undefined>;
  loading: Computed<boolean>;
  error: Computed<Error | null>;
  lastResult: Computed<T | null>;
  cancelAll(): void;
}

function isAbortError(err: unknown): boolean {
  return err instanceof Error && err.name === "AbortError";
}

export function task<T>(
  fn: (...args: unknown[]) => Promise<T>,
  options?: { signal?: boolean },
): TaskInstance<T> {
  const _loading = signal(false);
  const _error = signal<Error | null>(null);
  const _lastResult = signal<T | null>(null);
  let _runId = 0;
  let _controller: AbortController | null = null;
  const _wantsSignal = options?.signal ?? acceptsSignal(fn);

  async function run(...args: unknown[]): Promise<T | undefined> {
    _controller?.abort();
    const controller = new AbortController();
    _controller = controller;
    const id = ++_runId;
    _loading.set(true);
    _error.set(null);
    try {
      const result = await (_wantsSignal ? fn(controller.signal, ...args) : fn(...args));
      if (id !== _runId) return undefined;
      _lastResult.set(result);
      _loading.set(false);
      return result;
    } catch (err) {
      if (id !== _runId) return undefined;
      if (!isAbortError(err)) {
        _error.set(err instanceof Error ? err : new Error(String(err)));
      }
      _loading.set(false);
      return undefined;
    }
  }

  run.loading = computed(() => _loading());
  run.error = computed(() => _error());
  run.lastResult = computed(() => _lastResult());
  run.cancelAll = () => {
    _controller?.abort();
    _controller = null;
    _runId++;
    _loading.set(false);
  };

  return run as TaskInstance<T>;
}
