export interface BaseReactive<T> {
  (): T;
  subscribe(effect: (value: T) => void): () => void;
}

export interface Computed<T> extends BaseReactive<T> {
  __isComputed: true;
}

export interface WritableComputed<T> extends Computed<T> {
  set(value: T): void;
  update(updater: (prev: T) => T): void;
  __isWritableComputed: true;
}

export interface Signal<T> extends BaseReactive<T> {
  set(value: T): void;
  update(updater: (prev: T) => T): void;
  __isSignal: true;
}
