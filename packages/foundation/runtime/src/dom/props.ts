import { EVENT_MAP, VALUE_PROPS } from "./constants";
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

function setProp(el: Element, key: string, value: unknown): void {
  if (key === "class" || key === "className") {
    applyClass(el, value);
  } else if (key === "style") {
    applyStyle(el, value);
  } else if (VALUE_PROPS.has(key)) {
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
    (value as (el: Element) => void)(el);
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
