import { mountReactive } from "./reactive";

import type { Scope } from "./scope";

export function mountChildren(
  parent: Node,
  children: unknown,
  scope: Scope,
): void {
  if (children === null || children === undefined || children === false) return;

  if (typeof children === "string" || typeof children === "number") {
    // append() builds the text node natively: no JS wrapper is created for it.
    (parent as ParentNode).append(String(children));
    return;
  }

  if (typeof children === "function") {
    mountReactive(parent, children as () => unknown, scope);
    return;
  }

  if (children instanceof Node) {
    parent.appendChild(children);
    return;
  }

  if (Array.isArray(children)) {
    for (const child of children) {
      mountChildren(parent, child, scope);
    }
    return;
  }
}
