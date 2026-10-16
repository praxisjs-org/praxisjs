import type { EffectNode } from "@praxisjs/core/internal";

import { swapLazyScope, swapScope, type LazyScopeHost } from "./context";
import { removeNodes } from "./dom/remove";
import { onHydrationReplace, recording, registerReactiveNode } from "./hydration-context";


import type { Scope } from "./scope";

const NO_NODES: Node[] = [];

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

class Region implements LazyScopeHost {
  declare parent: Node;
  declare fn: () => unknown;
  /** Null when the region is all of `parent`'s content and appends to it. */
  declare end: Node | null;
  /**
   * What the region shows. A text node the region built itself is held by `text` alone (`nodes`
   * empty), so a text-only region never builds an array.
   */
  declare nodes: Node[];
  /** Set while the region shows exactly the text node built from a string/number result, so the
   * next string/number result rewrites it in place instead of swapping nodes. */
  declare text: Text | null;
  declare textValue: string;
  /**
   * Set when a text result went in through `parent.textContent` or `end.before()`, which build the
   * node natively, without a JS wrapper for it: the node is looked up only if a later run has to
   * change or remove it. Nothing else inserts right before `end` once the region is mounted, so it
   * is still `end`'s previous sibling (or the only child of `parent`) then.
   */
  declare lazyText: boolean;
  declare parentScope: Scope;
  /**
   * Forked the first time a run asks for the current scope, then reused across runs: disposing
   * empties it, so a re-run allocates no new scope. A region whose runs register nothing has none.
   */
  declare scope: Scope | null;

  constructor(parent: Node, fn: () => unknown, end: Node | null, placeholder: Text | null, parentScope: Scope) {
    this.parent = parent;
    this.fn = fn;
    this.end = end;
    this.nodes = NO_NODES;
    this.text = placeholder;
    this.textValue = placeholder === null ? "" : placeholder.data;
    this.lazyText = false;
    this.parentScope = parentScope;
    this.scope = null;
  }
}

// Keeps the region shape alive across full GCs; see the keeper in scope.ts. Built without a DOM so
// the runtime stays importable before one exists.
Object.defineProperty(Region, "shapeKeeper", {
  value: new Region(null as unknown as Node, () => undefined, null, null, null as unknown as Scope),
});

function runRegion(this: EffectNode<Region>): void {
  const region = this.ctx;
  const { parent, end } = region;
  region.scope?.dispose();
  const prevScope = swapScope(region.scope);
  const prevHost = swapLazyScope(region);
  let result: unknown;
  try {
    result = region.fn();
  } finally {
    swapScope(prevScope);
    swapLazyScope(prevHost);
  }
  const isText = typeof result === "string" || typeof result === "number";

  if (region.lazyText) {
    region.lazyText = false;
    region.text = (end === null ? parent.firstChild : end.previousSibling) as Text;
  }
  const text = region.text;

  if (isText && text !== null) {
    const value = String(result);
    if (value !== region.textValue) {
      text.data = value;
      region.textValue = value;
    }
    return;
  }

  const anchor = end === null ? parent : (end.parentNode ?? parent);
  const current = region.nodes;

  if (isText && current.length === 0 && !recording) {
    const value = String(result);
    region.textValue = value;
    // A null `end` with nothing shown means `parent` is empty. An empty string builds no node there.
    if (end === null ? value !== "" : end.parentNode !== null) {
      if (end === null) parent.textContent = value;
      else (end as ChildNode).before(value);
      region.lazyText = true;
      return;
    }
    const node = document.createTextNode(value);
    anchor.insertBefore(node, end);
    region.text = node;
    return;
  }

  const newNodes: Node[] = [];
  collectNodes(result, newNodes);

  // During a hydration build pass, remember that each of these fresh nodes
  // belongs to *this* array — reconcile() mutates `newNodes` in place (by
  // reference, same array `region.nodes` ends up pointing at) if it decides
  // to keep a real element instead of one of them, so future diffs here
  // stay correct.
  if (recording) {
    for (const n of newNodes) registerReactiveNode(n, newNodes);
  }

  if (current.length === 1) {
    anchor.removeChild(current[0]);
  } else if (current.length > 1) {
    removeNodes(current);
  } else if (text !== null) {
    anchor.removeChild(text);
  }

  if (newNodes.length > 0) {
    anchor.insertBefore(nodesToFragment(newNodes), end);
  }

  // Kept even for a lone text node: a hydration pass may swap a real node into this very array.
  region.nodes = newNodes;
  if (isText) {
    region.text = newNodes[0] as Text;
    region.textValue = region.text.data;
  } else {
    region.text = null;
  }
}

export function mountReactive(
  parent: Node,
  fn: () => unknown,
  parentScope: Scope,
  end: Node | null = parent.appendChild(document.createComment("")),
  placeholder: Text | null = null,
): void {
  // `placeholder` is an empty text node already in place (from a compiled template) that a text
  // result takes over.
  const region = new Region(parent, fn, end, placeholder, parentScope);
  // A hydration build pass mounts into a scratch tree. A region with an end node finds the real
  // parent through it once reconcile() moves it there; one without must be told which real element
  // reconcile() kept in place of `parent`.
  if (end === null && recording) onHydrationReplace(parent, (real) => { region.parent = real; });
  parentScope.contextEffect(runRegion, region);
}
