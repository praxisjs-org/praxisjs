import { endBatch, SignalNode, startBatch, writeSignal } from "@praxisjs/core/internal";
import type { Computed } from "@praxisjs/shared";

import { acceptsSignal, isAbortError, readonlyView, toError } from "./utils";

export interface PoolInstance<T> {
  (...args: unknown[]): Promise<T | undefined>;
  loading: Computed<boolean>;
  active: Computed<number>;
  pending: Computed<number>;
  error: Computed<Error | null>;
  cancelAll(): void;
}

interface PoolItem<T> {
  args: unknown[];
  resolve: (v: T | undefined) => void;
  controller: AbortController | undefined;
}

export function pool<T>(
  concurrency: number,
  fn: (...args: unknown[]) => Promise<T>,
  options?: { signal?: boolean },
): PoolInstance<T> {
  concurrency = Math.max(1, concurrency);
  const activeNode = new SignalNode(0);
  const pendingNode = new SignalNode(0);
  const loadingNode = new SignalNode(false);
  const error = new SignalNode<Error | null>(null);
  const wantsSignal = options?.signal ?? acceptsSignal(fn);
  // Plain counters drive scheduling: reading the signals here would subscribe whatever effect
  // happens to call the pool.
  let active = 0;
  let items: Array<PoolItem<T> | undefined> = [];
  let head = 0;
  const activeControllers = new Set<AbortController>();

  function publish(): void {
    startBatch();
    writeSignal(activeNode, active);
    writeSignal(pendingNode, items.length - head);
    writeSignal(loadingNode, active > 0);
    endBatch();
  }

  async function execute(item: PoolItem<T>): Promise<void> {
    const { args, resolve, controller } = item;
    if (controller) activeControllers.add(controller);
    try {
      resolve(await (controller ? fn(controller.signal, ...args) : fn(...args)));
    } catch (err) {
      if (!isAbortError(err)) writeSignal(error, toError(err));
      resolve(undefined);
    } finally {
      if (controller) activeControllers.delete(controller);
      active--;
      pump();
    }
  }

  function pump(): void {
    while (active < concurrency && head < items.length) {
      const item = items[head] as PoolItem<T>;
      items[head++] = undefined;
      if (head === items.length) {
        items = [];
        head = 0;
      }
      active++;
      void execute(item);
    }
    publish();
  }

  function run(...args: unknown[]): Promise<T | undefined> {
    return new Promise<T | undefined>((resolve) => {
      items.push({ args, resolve, controller: wantsSignal ? new AbortController() : undefined });
      // While every slot is busy only the backlog grows.
      if (active < concurrency) pump();
      else writeSignal(pendingNode, items.length - head);
    });
  }

  run.loading = readonlyView(loadingNode);
  run.active = readonlyView(activeNode);
  run.pending = readonlyView(pendingNode);
  run.error = readonlyView(error);
  run.cancelAll = () => {
    for (const c of activeControllers) c.abort();
    activeControllers.clear();
    const cleared = items;
    const from = head;
    items = [];
    head = 0;
    for (let i = from; i < cleared.length; i++) {
      const item = cleared[i] as PoolItem<T>;
      item.controller?.abort();
      item.resolve(undefined);
    }
    publish();
  };

  return run as PoolInstance<T>;
}
