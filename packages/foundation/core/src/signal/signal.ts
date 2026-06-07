import type { Signal } from "@praxisjs/shared";

import { isBatching, enqueueEffect } from "./batch";
import {
  activeEffect,
  recordDependency,
  type Effect,
  type SubList,
  type SubscriberHolder,
} from "./effect";

export type { SubList } from "./effect";

export function addSub(holder: SubscriberHolder, eff: Effect): void {
  const subs = holder.subs;
  if (subs === null) {
    holder.subs = eff;
  } else if (typeof subs === "function") {
    if (subs !== eff) holder.subs = [subs, eff];
  } else {
    if (!subs.includes(eff)) subs.push(eff);
  }
  recordDependency(eff, holder);
}

export function removeSub(holder: SubscriberHolder, eff: Effect): void {
  const subs = holder.subs;
  if (subs === null) return;
  if (typeof subs === "function") {
    if (subs === eff) holder.subs = null;
  } else {
    const idx = subs.indexOf(eff);
    if (idx >= 0) subs.splice(idx, 1);
    if (subs.length === 0) holder.subs = null;
  }
}

export function notifySubs(subs: Exclude<SubList, null>, batching: boolean): void {
  if (typeof subs === "function") {
    if (batching) enqueueEffect(subs); else subs();
    return;
  }
  const snapshot = [...subs];
  if (batching) {
    for (const sub of snapshot) enqueueEffect(sub);
    return;
  }
  let lastError: unknown;
  let hasError = false;
  for (const sub of snapshot) {
    try {
      sub();
    } catch (e) {
      lastError = e;
      hasError = true;
    }
  }
  if (hasError) throw lastError;
}

export function signal<T>(initialValue: T): Signal<T> {
  let value = initialValue;
  const holder = { subs: null as SubList };

  function read(): T {
    if (activeEffect !== null) addSub(holder, activeEffect);
    return value;
  }

  const s = read as Signal<T>;

  s.set = (newValue: T) => {
    if (Object.is(value, newValue)) return;
    value = newValue;
    if (holder.subs !== null) notifySubs(holder.subs, isBatching());
  };

  s.update = (fn: (prev: T) => T) => { s.set(fn(value)); };

  s.subscribe = (fn: (value: T) => void) => {
    const wrapped: Effect = () => { fn(value); };
    addSub(holder, wrapped);
    wrapped();
    return () => { removeSub(holder, wrapped); };
  };

  s.__isSignal = true;
  return s;
}
