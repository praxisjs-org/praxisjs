import { track, activeEffect, type Effect } from "./effect";

export interface Signal<T> {
  (): T;
  set(value: T): void;
  update(updater: (prev: T) => T): void;
  subscribe(effect: (value: T) => void): () => void;
}

export function signal<T>(initialValue: T): Signal<T> {
  let value = initialValue;
  const subscribers = new Set<Effect>();

  function read() {
    if (activeEffect) {
      subscribers.add(activeEffect);
    }
    return value;
  }

  function set(newValue: T) {
    if (Object.is(value, newValue)) return;

    value = newValue;
    [...subscribers].forEach((sub) => sub());
  }

  function update(fn: (prev: T) => T) {
    set(fn(value));
  }

  function subscribe(fn: (value: T) => void) {
    const wrapped = () => fn(value);
    subscribers.add(wrapped);
    wrapped();
    return () => subscribers.delete(wrapped);
  }

  const signal = read as Signal<T>;
  signal.set = set;
  signal.update = update;
  signal.subscribe = subscribe;

  return signal;
}
