import { mountChildren } from "./children";
import { createElement } from "./dom/create";
import { applyProp } from "./dom/props";
import { recording, recordProps } from "./hydration-context";

import type { Scope } from "./scope";

export function mountElement(
  tag: string,
  props: Record<string, unknown>,
  scope: Scope,
): HTMLElement | SVGElement {
  const el = createElement(tag);

  // During a hydration build pass, retain (props, scope) so reconcile() can
  // replay them onto whichever real element it ends up keeping instead.
  if (recording) recordProps(el, props, scope);

  // Children before props: a prop that depends on them (a <select>'s value picking one of its
  // options, a ref reading the subtree) would otherwise run against an empty element.
  if (props.children !== undefined) {
    mountChildren(el, props.children, scope);
  }

  for (const key in props) {
    if (key === "children") continue;
    applyProp(el, key, props[key], scope);
  }

  return el;
}
