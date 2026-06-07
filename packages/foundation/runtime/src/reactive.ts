import { runInScope } from "./context";
import { Scope } from "./scope";

function collectNodes(value: unknown, out: Node[]): void {
  if (value === null || value === undefined || value === false) return;
  if (value instanceof Node) { out.push(value); return; }
  if (Array.isArray(value)) { for (const v of value) collectNodes(v, out); return; }
  if (typeof value === "string" || typeof value === "number") {
    out.push(document.createTextNode(String(value)));
    return;
  }
}

function nodesToFragment(nodes: Node[]): Node {
  if (nodes.length === 1) return nodes[0];
  const fragment = document.createDocumentFragment();
  for (const n of nodes) fragment.appendChild(n);
  return fragment;
}

export function mountReactive(
  parent: Node,
  fn: () => unknown,
  parentScope: Scope,
): void {
  const end = document.createComment("");
  parent.appendChild(end);

  let currentNodes: Node[] = [];
  let childScope = new Scope();

  parentScope.effect(() => {
    childScope.dispose();
    childScope = new Scope();

    const result = runInScope(childScope, fn);
    const newNodes: Node[] = [];
    collectNodes(result, newNodes);

    const anchor = end.parentNode ?? parent;

    if (currentNodes.length > 0) {
      if (currentNodes.length === 1) {
        (anchor as Element).removeChild(currentNodes[0]);
      } else {
        const range = document.createRange();
        range.setStartBefore(currentNodes[0]);
        range.setEndAfter(currentNodes[currentNodes.length - 1]);
        range.deleteContents();
      }
    }

    if (newNodes.length > 0) {
      anchor.insertBefore(nodesToFragment(newNodes), end);
    }

    currentNodes = newNodes;
  });

  parentScope.add(() => { childScope.dispose(); });
}
