import type { Signal } from "@praxisjs/shared";

import { signal } from "./signal";

export interface PersistedSignalOptions<T> {
  serialize?: (value: T) => string;
  deserialize?: (value: string) => T;
  syncTabs?: boolean;
  /**
   * Milliseconds to hold back writes to `localStorage`. Writes within the window are coalesced
   * into one, using the latest value; pending data is flushed on `pagehide` and `close()`.
   * `0` (default) writes on every `set`.
   */
  writeDelay?: number;
}

export interface PersistedSignal<T> extends Signal<T> {
  /** Stops listening for `storage` events from other tabs. The signal keeps working locally. */
  close(): void;
}

export function persistedSignal<T>(
  key: string,
  initialValue: T,
  options: PersistedSignalOptions<T> = {},
) {
  const {
    serialize = JSON.stringify,
    deserialize = JSON.parse as (value: string) => T,
    syncTabs = true,
    writeDelay = 0,
  } = options;

  function getStoredValue(): T {
    try {
      const stored = localStorage.getItem(key);
      return stored ? deserialize(stored) : initialValue;
    } catch (e) {
      console.warn(`Failed to deserialize value for key "${key}":`, e);
      return initialValue;
    }
  }

  function setStoredValue(value: T) {
    try {
      if (value === undefined || value === null) {
        localStorage.removeItem(key);
      } else {
        localStorage.setItem(key, serialize(value));
      }
    } catch (e) {
      console.warn(`Failed to serialize value for key "${key}":`, e);
    }
  }

  let pendingWrite: { value: T } | undefined;
  let writeTimer: ReturnType<typeof setTimeout> | undefined;

  function flushWrite(): void {
    clearTimeout(writeTimer);
    writeTimer = undefined;
    if (!pendingWrite) return;
    const { value } = pendingWrite;
    pendingWrite = undefined;
    setStoredValue(value);
  }

  // The timer starts at the first write of a burst (throttle, not debounce) so a value that keeps
  // changing still reaches storage within `writeDelay`.
  function scheduleWrite(value: T): void {
    if (writeDelay <= 0) {
      setStoredValue(value);
      return;
    }
    pendingWrite = { value };
    writeTimer ??= setTimeout(flushWrite, writeDelay);
  }

  const inner = signal(getStoredValue());

  function read() {
    return inner();
  }

  function set(value: T) {
    scheduleWrite(value);
    inner.set(value);
  }

  function update(fh: (prev: T) => T) {
    const newValue = fh(inner());
    scheduleWrite(newValue);
    inner.set(newValue);
  }

  let removeStorageListener: (() => void) | undefined;

  if (syncTabs) {
    const onStorage = (event: StorageEvent): void => {
      if (event.key !== key || event.storageArea !== localStorage) return;
      // Another tab's value wins; a still-pending local write would overwrite it later.
      pendingWrite = undefined;
      try {
        const newValue = event.newValue
          ? deserialize(event.newValue)
          : initialValue;
        inner.set(newValue);
      } catch (e) {
        console.warn(
          `Failed to deserialize value for key "${key}" from storage event:`,
          e,
        );
        inner.set(initialValue);
      }
    };
    window.addEventListener("storage", onStorage);
    removeStorageListener = () => { window.removeEventListener("storage", onStorage); };
  }

  if (writeDelay > 0) window.addEventListener("pagehide", flushWrite);

  const source = read as PersistedSignal<T>;
  source.set = set;
  source.update = update;
  source.subscribe = inner.subscribe.bind(inner);
  source.__isSignal = true;
  source.close = () => {
    removeStorageListener?.();
    removeStorageListener = undefined;
    window.removeEventListener("pagehide", flushWrite);
    flushWrite();
  };

  return source;
}
