// Replaces Range.deleteContents(): creating a Range per removal is several times slower than
// walking the siblings, and unreachable Ranges stay registered with the document until collected.
// Walking first → last (rather than only the tracked nodes) also removes anything a nested reactive
// child inserted between them after mount, which is what the Range used to cover.
export function removeNodes(nodes: Node[]): void {
  const first = nodes[0];
  const last = nodes[nodes.length - 1];
  const parent = first.parentNode;

  if (parent === null || last.parentNode !== parent) {
    for (const node of nodes) node.parentNode?.removeChild(node);
    return;
  }

  let node: Node | null = first;
  while (node) {
    const next: Node | null = node.nextSibling;
    parent.removeChild(node);
    if (node === last) return;
    node = next;
  }
}
