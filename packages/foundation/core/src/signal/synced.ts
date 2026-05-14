import type { Signal } from "@praxisjs/shared";

import { signal } from "./signal";

export interface SyncedSignal<T> extends Signal<T> {
  close(): void;
}

export function syncedSignal<T>(
  channelName: string,
  initialValue: T,
): SyncedSignal<T> {
  const inner = signal(initialValue);
  const channel = new BroadcastChannel(channelName);
  let posting = false;

  channel.onmessage = (event: MessageEvent) => {
    if (posting) return;
    try {
      inner.set(JSON.parse(String(event.data)) as T);
    } catch {
      // ignore malformed messages
    }
  };

  function read() {
    return inner();
  }

  function set(value: T) {
    posting = true;
    try {
      inner.set(value);
      channel.postMessage(JSON.stringify(value));
    } finally {
      posting = false;
    }
  }

  function update(fn: (prev: T) => T) {
    set(fn(inner()));
  }

  function close() {
    channel.close();
  }

  const source = read as SyncedSignal<T>;
  source.set = set;
  source.update = update;
  source.subscribe = inner.subscribe.bind(inner);
  source.__isSignal = true;
  source.close = close;

  return source;
}
