import type { Signal } from "@praxisjs/shared";

import { isBatching, enqueueEffect } from "./batch";
import { activeEffect, type Effect } from "./effect";

export type SubList = Effect | Effect[] | null;

export function addSub(holder: { subs: SubList }, eff: Effect): void {
  const subs = holder.subs;
  if (subs === null) {
    holder.subs = eff;
  } else if (typeof subs === "function") {
    if (subs !== eff) holder.subs = [subs, eff];
  } else {
    if (!subs.includes(eff)) subs.push(eff);
  }
}

export function removeSub(holder: { subs: SubList }, eff: Effect): void {
  const subs = holder.subs;
  if (subs === null) return;
  if (typeof subs === "function") {
    if (subs === eff) holder.subs = null;
  } else {
    const idx = subs.indexOf(eff);
    if (idx >= 0) subs.splice(idx, 1);
  }
}

export function notifySubs(subs: Exclude<SubList, null>, batching: boolean): void {
  if (typeof subs === "function") {
    if (batching) enqueueEffect(subs); else subs();
    return;
  }
  if (batching) {
    for (const sub of subs) enqueueEffect(sub);
    return;
  }
  let lastError: unknown;
  let hasError = false;
  for (const sub of subs) {
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
