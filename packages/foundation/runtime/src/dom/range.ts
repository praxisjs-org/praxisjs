type MovableParent = Node & {
  moveBefore?: (node: Node, child: Node | null) => void;
};

// moveBefore() keeps focus, iframes, playing media and running CSS animations/transitions of the
// moved subtree, which a remove + insert resets. It only applies inside a connected tree (both nodes
// already share the parent here), so a detached parent such as a DocumentFragment uses insertBefore.
export function moveNode(parent: Node, node: Node, ref: Node | null): void {
  const target = parent as MovableParent;
  if (target.moveBefore !== undefined && target.isConnected) {
    target.moveBefore(node, ref);
  } else {
    parent.insertBefore(node, ref);
  }
}

// Every node from `first` to `last` (inclusive) moves, not only the tracked ones, so anything a
// nested reactive child inserted between them after mount travels with them.
export function moveRange(parent: Node, first: Node, last: Node, ref: Node | null): void {
  if (first === last) {
    moveNode(parent, first, ref);
    return;
  }
  let node: Node = first;
  for (;;) {
    const next = node.nextSibling as Node;
    moveNode(parent, node, ref);
    if (node === last) return;
    node = next;
  }
}

export function removeRange(parent: Node, first: Node, last: Node): void {
  if (first === last) {
    parent.removeChild(first);
    return;
  }
  let node: Node = first;
  for (;;) {
    const next = node.nextSibling as Node;
    parent.removeChild(node);
    if (node === last) return;
    node = next;
  }
}
