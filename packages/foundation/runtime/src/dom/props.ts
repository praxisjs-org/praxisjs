import { untrack, type EffectNode } from "@praxisjs/core/internal";

import { EVENT_MAP } from "./constants";
import { addEvent } from "./events";

import type { Scope } from "../scope";

function applyClass(el: Element, value: unknown): void {
  if (value === null || value === undefined) {
    el.removeAttribute("class");
  } else if (el instanceof HTMLElement) {
    // eslint-disable-next-line @typescript-eslint/no-base-to-string
    const next = String(value);
    // Reading is cheap; writing invalidates the element's style even when nothing changes, which
    // is what a first binding run does on every element whose class starts empty.
    if (el.className !== next) el.className = next;
  } else {
    // SVG elements expose className as an SVGAnimatedString, so the attribute is the way in (as
    // for any element of another kind, or of another window).
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
  if (typeof value === "boolean" && key.startsWith("aria-")) {
    // ARIA states are the strings "true" and "false", not HTML boolean attributes: an empty or
    // missing aria-selected/aria-expanded reads as unset to assistive technology.
    el.setAttribute(key, value ? "true" : "false");
  } else if (value === false || value === null || value === undefined) {
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
export function hasWritableProperty(el: Element, key: string): boolean {
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

export function setProp(el: Element, key: string, value: unknown): void {
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
    if (typeof value === "function") untrack(() => { (value as (el: Element) => void)(el); });
    return;
  }

  // Every event prop starts with "on": checking that first keeps other props off the map lookup.
  const type = normalizedKey.startsWith("on") ? EVENT_MAP.get(normalizedKey) : undefined;
  if (type !== undefined) {
    addEvent(el, type, value as EventListener, scope);
    return;
  }

  if (typeof value === "function") {
    bindProp(el, normalizedKey, value as () => unknown, scope);
    return;
  }

  setProp(el, normalizedKey, value);
}

// State the user can change behind a binding's back (typing, toggling a <details>, the media
// controls, scrolling): always written, so a re-run puts the bound value back exactly as before.
const LIVE_PROPS = new Set([
  "value", "checked", "selected", "indeterminate", "selectedIndex", "open",
  "muted", "volume", "currentTime", "playbackRate", "scrollTop", "scrollLeft",
]);
const UNSET = Symbol("unset");

interface PropBinding {
  el: Element;
  key: string;
  read: () => unknown;
  last: unknown;
}

// One function for every binding, reading its state from the effect: no closure per binding.
function runBinding(this: EffectNode<PropBinding>): void {
  const binding = this.ctx;
  const value = binding.read();
  // A binding re-runs when anything it read changes; most re-runs produce the same primitive,
  // and skipping that write saves a DOM call and the style or attribute work behind it.
  if (value === binding.last && (typeof value !== "object" || value === null)) return;
  binding.last = value;
  setProp(binding.el, binding.key, value);
}

function runLiveBinding(this: EffectNode<PropBinding>): void {
  const binding = this.ctx;
  setProp(binding.el, binding.key, binding.read());
}

function bindProp(el: Element, key: string, read: () => unknown, scope: Scope): void {
  scope.contextEffect(LIVE_PROPS.has(key) ? runLiveBinding : runBinding, { el, key, read, last: UNSET });
}

function runClassBinding(this: EffectNode<PropBinding>): void {
  const binding = this.ctx;
  const value = binding.read();
  if (value === binding.last && (typeof value !== "object" || value === null)) return;
  binding.last = value;
  applyClass(binding.el, value);
}

/** A reactive `class` prop, bound like any other reactive prop but with no key dispatch per run. */
export function bindClass(el: Element, read: () => unknown, scope: Scope): void {
  // Same record shape as bindProp's, so the effects of both kinds stay one shape.
  scope.contextEffect(runClassBinding, { el, key: "class", read, last: UNSET });
}
