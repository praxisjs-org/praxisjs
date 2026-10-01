import { untrack } from "@praxisjs/core/internal";

import { EVENT_MAP } from "./constants";
import { addEvent } from "./events";

import type { Scope } from "../scope";

function applyClass(el: Element, value: unknown): void {
  if (value === null || value === undefined) {
    el.removeAttribute("class");
  } else {
    // eslint-disable-next-line @typescript-eslint/no-base-to-string
    el.setAttribute("class", String(value));
  }
}

function applyStyle(el: Element, value: unknown): void {
  if (value === null || value === undefined) {
    el.removeAttribute("style");
  } else if (typeof value === "object") {
    const htmlEl = el as HTMLElement;
    htmlEl.removeAttribute("style");
    for (const [k, v] of Object.entries(value as Record<string, string>)) {
      if (k.startsWith("--")) {
        htmlEl.style.setProperty(k, v);
      } else {
        (htmlEl.style as unknown as Record<string, string>)[k] = v;
      }
    }
  } else {
    // eslint-disable-next-line @typescript-eslint/no-base-to-string
    el.setAttribute("style", String(value));
  }
}

function applyAttr(el: Element, key: string, value: unknown): void {
  if (value === false || value === null || value === undefined) {
    el.removeAttribute(key);
  } else if (value === true) {
    el.setAttribute(key, "");
  } else {
    // eslint-disable-next-line @typescript-eslint/no-base-to-string
    el.setAttribute(key, String(value));
  }
}

const writableCache = new WeakMap<object, Map<string, boolean>>();

function lookupWritable(proto: object, key: string): boolean {
  let target: object | null = proto;
  while (target) {
    const descriptor = Object.getOwnPropertyDescriptor(target, key);
    if (descriptor) {
      return descriptor.set !== undefined || descriptor.writable === true;
    }
    target = Object.getPrototypeOf(target) as object | null;
  }
  return false;
}

// Read-only accessors (SVG geometry, `list`, `form`, `part`, `classList`…)
// must be excluded here or assignment below throws. The prototype walk is cached per
// prototype because every element of a given tag repeats the same lookups; a property defined on
// a prototype after its first lookup (e.g. a late polyfill) is therefore not picked up.
function hasWritableProperty(el: Element, key: string): boolean {
  const own = Object.getOwnPropertyDescriptor(el, key);
  if (own) return own.set !== undefined || own.writable === true;

  const proto = Object.getPrototypeOf(el) as object;
  let keys = writableCache.get(proto);
  if (!keys) {
    keys = new Map();
    writableCache.set(proto, keys);
  }
  let writable = keys.get(key);
  if (writable === undefined) {
    writable = lookupWritable(proto, key);
    keys.set(key, writable);
  }
  return writable;
}

function setProp(el: Element, key: string, value: unknown): void {
  if (key === "class" || key === "className") {
    applyClass(el, value);
  } else if (key === "style") {
    applyStyle(el, value);
  } else if (value === null || value === undefined) {
    el.removeAttribute(key);
  } else if (hasWritableProperty(el, key)) {
    (el as unknown as Record<string, unknown>)[key] = value;
  } else {
    applyAttr(el, key, value);
  }
}

export function applyProp(
  el: Element,
  key: string,
  value: unknown,
  scope: Scope,
): void {
  const normalizedKey = key === "htmlFor" ? "for" : key;

  if (normalizedKey === "key" || normalizedKey === "children") return;

  if (normalizedKey === "ref") {
    // untracked: a ref callback that reads a signal must not subscribe the enclosing reactive child
    untrack(() => { (value as (el: Element) => void)(el); });
    return;
  }

  if (normalizedKey in EVENT_MAP) {
    addEvent(el, EVENT_MAP[normalizedKey], value as EventListener, scope);
    return;
  }

  if (typeof value === "function") {
    scope.effect(() => {
      setProp(el, normalizedKey, (value as () => unknown)());
    });
    return;
  }

  setProp(el, normalizedKey, value);
}
