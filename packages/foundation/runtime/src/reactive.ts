import { runInScope } from "./context";

import type { Scope } from "./scope";

function normalizeToNodes(value: unknown): Node[] {
  if (value === null || value === undefined || value === false) return [];
  if (value instanceof Node) return [value];
  if (Array.isArray(value)) return value.flatMap(normalizeToNodes);
  if (typeof value === "string" || typeof value === "number") {
    return [document.createTextNode(String(value))];
  }
  return [];
}

export function mountReactive(
  parent: Node,
  fn: () => unknown,
  parentScope: Scope,
): void {
  const end = document.createComment("reactive");
  parent.appendChild(end);

  let currentNodes: Node[] = [];
  let childScope = parentScope.fork();

  parentScope.effect(() => {
    childScope.dispose();
    childScope = parentScope.fork();

    for (const n of currentNodes) {
      n.parentNode?.removeChild(n);
    }
    currentNodes = [];

    const result = runInScope(childScope, fn);
    const newNodes = normalizeToNodes(result);

    // Use end.parentNode instead of the original `parent` — the parent
    // reference may be a DocumentFragment that was emptied after its
    // children were transferred to the real DOM by mountComponent.
    const anchor = end.parentNode ?? parent;
    for (const n of newNodes) {
      anchor.insertBefore(n, end);
    }
    currentNodes = newNodes;
  });

  parentScope.add(() => { childScope.dispose(); });
}
