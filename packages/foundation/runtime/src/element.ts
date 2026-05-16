import { mountChildren } from "./children";
import { createElement } from "./dom/create";
import { applyProp } from "./dom/props";

import type { Scope } from "./scope";

export function mountElement(
  tag: string,
  props: Record<string, unknown>,
  scope: Scope,
): HTMLElement | SVGElement {
  const el = createElement(tag);

  for (const key in props) {
    if (key === "children") continue;
    applyProp(el, key, props[key], scope);
  }

  if (props.children !== undefined) {
    mountChildren(el, props.children, scope);
  }

  return el;
}
