import { SignalNode, writeSignal } from "@praxisjs/core/internal";
import type { Computed } from "@praxisjs/shared";

import { acceptsSignal, isAbortError, readonlyView, toError } from "./utils";

export class QueueClearedError extends Error {
  constructor() {
    super("Queue cleared");
    this.name = "QueueClearedError";
  }
}

export interface QueueInstance<T> {
  (...args: unknown[]): Promise<T>;
  loading: Computed<boolean>;
  pending: Computed<number>;
  error: Computed<Error | null>;
  clear(): void;
}

interface QueueItem<T> {
  args: unknown[];
  resolve: (v: T) => void;
  reject: (e: Error) => void;
  controller: AbortController | undefined;
}

export function queue<T>(
  fn: (...args: unknown[]) => Promise<T>,
  options?: { signal?: boolean },
): QueueInstance<T> {
  const loading = new SignalNode(false);
  const pending = new SignalNode(0);
  const error = new SignalNode<Error | null>(null);
  const wantsSignal = options?.signal ?? acceptsSignal(fn);
  // FIFO read from `head`: shifting the array instead made draining n calls O(n²).
  let items: Array<QueueItem<T> | undefined> = [];
  let head = 0;
  let running = false;
  let inCall = false;
  let activeController: AbortController | undefined;
  let activeAbortedByClear = false;

  async function drain(): Promise<void> {
    if (running || head === items.length) return;
    running = true;
    writeSignal(loading, true);
    while (head < items.length) {
      const item = items[head] as QueueItem<T>;
      items[head++] = undefined;
      if (head === items.length) {
        items = [];
        head = 0;
      }

      const { args, resolve, reject, controller } = item;
      activeController = controller;
      activeAbortedByClear = false;
      inCall = true;
      writeSignal(pending, items.length - head);
      try {
        const result = await (controller ? fn(controller.signal, ...args) : fn(...args));
        resolve(result);
      } catch (err) {
        // activeAbortedByClear is set by clear() while the call is awaited
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        if (isAbortError(err) && activeAbortedByClear) {
          reject(new QueueClearedError());
        } else {
          const e = toError(err);
          writeSignal(error, e);
          reject(e);
        }
      } finally {
        inCall = false;
        activeController = undefined;
      }
    }
    running = false;
    writeSignal(loading, false);
  }

  function enqueue(...args: unknown[]): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      items.push({ args, resolve, reject, controller: wantsSignal ? new AbortController() : undefined });
      writeSignal(pending, items.length - head);
      void drain();
    });
  }

  enqueue.loading = readonlyView(loading);
  enqueue.pending = readonlyView(pending);
  enqueue.error = readonlyView(error);
  enqueue.clear = () => {
    if (inCall) {
      activeAbortedByClear = true;
      activeController?.abort();
    }
    const cleared = items;
    const from = head;
    items = [];
    head = 0;
    for (let i = from; i < cleared.length; i++) {
      const item = cleared[i] as QueueItem<T>;
      item.controller?.abort();
      item.reject(new QueueClearedError());
    }
    writeSignal(pending, 0);
  };

  return enqueue as QueueInstance<T>;
}
