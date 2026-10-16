import { endBatch, SignalNode, startBatch, writeSignal } from "@praxisjs/core/internal";
import type { Computed } from "@praxisjs/shared";

import { acceptsSignal, isAbortError, readonlyView, toError } from "./utils";

export interface TaskInstance<T> {
  (...args: unknown[]): Promise<T | undefined>;
  loading: Computed<boolean>;
  error: Computed<Error | null>;
  lastResult: Computed<T | null>;
  cancelAll(): void;
}

export function task<T>(
  fn: (...args: unknown[]) => Promise<T>,
  options?: { signal?: boolean },
): TaskInstance<T> {
  const loading = new SignalNode(false);
  const error = new SignalNode<Error | null>(null);
  const lastResult = new SignalNode<T | null>(null);
  let runId = 0;
  // Only created when `fn` takes a signal: nothing else could observe the abort.
  let controller: AbortController | null = null;
  const wantsSignal = options?.signal ?? acceptsSignal(fn);

  async function run(...args: unknown[]): Promise<T | undefined> {
    const id = ++runId;
    let signal: AbortSignal | undefined;
    if (wantsSignal) {
      controller?.abort();
      controller = new AbortController();
      signal = controller.signal;
    }
    startBatch();
    writeSignal(loading, true);
    writeSignal(error, null);
    endBatch();
    try {
      const result = await (signal ? fn(signal, ...args) : fn(...args));
      if (id !== runId) return undefined;
      startBatch();
      writeSignal(lastResult, result);
      writeSignal(loading, false);
      endBatch();
      return result;
    } catch (err) {
      if (id !== runId) return undefined;
      startBatch();
      if (!isAbortError(err)) writeSignal(error, toError(err));
      writeSignal(loading, false);
      endBatch();
      return undefined;
    }
  }

  run.loading = readonlyView(loading);
  run.error = readonlyView(error);
  run.lastResult = readonlyView(lastResult);
  run.cancelAll = () => {
    controller?.abort();
    controller = null;
    runId++;
    writeSignal(loading, false);
  };

  return run as TaskInstance<T>;
}
