import type { Scope } from "./scope";

let _recording = false;

/**
 * Marks the synchronous "build" pass of a hydration attempt: `factory()` runs
 * completely normally (same create-mode code as a plain client render), but
 * every element additionally records its (props, scope) for reconcile()'s
 * replay step, and every mountReactive() region records which of its output
 * nodes may need to be swapped in-place if reconcile() decides to keep a real
 * element instead of the fresh one. No-op / zero cost outside a build pass.
 */
export function runInRecording<T>(fn: () => T): T {
  const prev = _recording;
  _recording = true;
  try {
    return fn();
  } finally {
    _recording = prev;
  }
}

export function isRecording(): boolean {
  return _recording;
}

interface PropRecord {
  props: Record<string, unknown>;
  scope: Scope;
}

const _propRecords = new WeakMap<Element, PropRecord>();

export function recordProps(el: Element, props: Record<string, unknown>, scope: Scope): void {
  _propRecords.set(el, { props, scope });
}

export function getRecordedProps(el: Element): PropRecord | undefined {
  return _propRecords.get(el);
}

// mountReactive() keeps a `currentNodes` array (by reference) for diffing its
// *next* update. If reconcile() replaces one of those fresh nodes with a real
// one, it needs to overwrite that array in place so the closure sees the swap.
const _reactiveOwners = new WeakMap<Node, Node[]>();

export function registerReactiveNode(node: Node, owner: Node[]): void {
  _reactiveOwners.set(node, owner);
}

export function getReactiveOwner(node: Node): Node[] | undefined {
  return _reactiveOwners.get(node);
}
