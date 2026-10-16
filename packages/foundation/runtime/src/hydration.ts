import { applyProp } from "./dom/props";
import { getHydrationReplacer, getRecordedProps } from "./hydration-context";

function replayProps(real: Element, fresh: Element): void {
  const record = getRecordedProps(fresh);
  if (!record) return;
  for (const key in record.props) {
    if (key === "children") continue;
    applyProp(real, key, record.props[key], record.scope);
  }
}

// mountReactive()'s `currentNodes` and list rows keep fresh node references for their
// *next* update. If we're keeping `real` instead of `fresh` here, they need to see the swap.
function notifyReplacement(fresh: Node, real: Node): void {
  getHydrationReplacer(fresh)?.(real);
}

/**
 * Walks `freshChildren` (the complete, correctly-nested output of a normal
 * create-mode mount into a detached scratch node) against `realParent`'s
 * existing children (the server-rendered DOM already attached to the page),
 * in document order — safe now that both trees are fully built, unlike trying
 * to adopt while `freshChildren` was still being constructed.
 *
 * Matching elements keep the real node (props/listeners replayed onto it,
 * via `applyProp` — the same function normal mounting uses) and recurse.
 * Text/comment nodes are always taken from the fresh side — they carry no
 * listeners or state, so recreating them is free and avoids having to
 * re-point mountComponent/mountReactive's anchor comments. Anything that
 * doesn't line up (different tag, or one side ran out) is a local mismatch:
 * the stale real node is dropped and the fresh one takes its place — no
 * lookahead, no reordering, and no whole-page fallback.
 */
export function reconcile(realParent: Node, freshChildren: Node[]): void {
  let realCursor: ChildNode | null = realParent.firstChild;

  for (const fresh of freshChildren) {
    if (
      fresh.nodeType === Node.ELEMENT_NODE &&
      realCursor?.nodeType === Node.ELEMENT_NODE &&
      (realCursor as Element).localName === (fresh as Element).localName
    ) {
      const real = realCursor as Element;
      realCursor = real.nextSibling;
      replayProps(real, fresh as Element);
      reconcile(real, Array.from((fresh as Element).childNodes));
      notifyReplacement(fresh, real);
      continue;
    }

    if (realCursor) {
      const stale = realCursor;
      realCursor = realCursor.nextSibling;
      stale.remove();
    }
    realParent.insertBefore(fresh, realCursor);
  }

  while (realCursor) {
    const stale = realCursor;
    realCursor = realCursor.nextSibling;
    stale.remove();
  }
}
