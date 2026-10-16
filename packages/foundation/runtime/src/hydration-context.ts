import type { Scope } from "./scope";

/**
 * True during a hydration build pass (see runInRecording). Exported as a live binding so the hot
 * render paths read a variable instead of calling isRecording() for every binding.
 */
 
export let recording = false;

/**
 * Marks the synchronous "build" pass of a hydration attempt: `factory()` runs
 * completely normally (same create-mode code as a plain client render), but
 * every element additionally records its (props, scope) for reconcile()'s
 * replay step, and every mountReactive() region records which of its output
 * nodes may need to be swapped in-place if reconcile() decides to keep a real
 * element instead of the fresh one. No-op / zero cost outside a build pass.
 */
export function runInRecording<T>(fn: () => T): T {
  const prev = recording;
  recording = true;
  try {
    return fn();
  } finally {
    recording = prev;
  }
}

export function isRecording(): boolean {
  return recording;
}

interface PropRecord {
  props: Record<string, unknown>;
  scope: Scope;
}

const _propRecords = new WeakMap<Element, PropRecord>();

export function recordProps(el: Element, props: Record<string, unknown>, scope: Scope): void {
  _propRecords.set(el, { props, scope });
}

/** Adds one prop to an element's record, for elements whose props are applied one at a time. */
export function recordProp(el: Element, key: string, value: unknown, scope: Scope): void {
  const record = _propRecords.get(el);
  if (record === undefined) _propRecords.set(el, { props: { [key]: value }, scope });
  else record.props[key] = value;
}

export function getRecordedProps(el: Element): PropRecord | undefined {
  return _propRecords.get(el);
}

// Code that keeps references to fresh nodes for its *next* update (mountReactive's
// `currentNodes`, a list row's boundaries) registers how to repoint them, so reconcile()
// can tell it when it keeps a real element in place of a fresh one. One node can have several
// owners (a list row's element is also part of the nodes an enclosing reactive child returned).
const _replacers = new WeakMap<Node, (real: Node) => void>();

export function onHydrationReplace(node: Node, replace: (real: Node) => void): void {
  const prev = _replacers.get(node);
  _replacers.set(node, prev === undefined ? replace : (real) => { prev(real); replace(real); });
}

export function getHydrationReplacer(node: Node): ((real: Node) => void) | undefined {
  return _replacers.get(node);
}

export function registerReactiveNode(node: Node, owner: Node[]): void {
  onHydrationReplace(node, (real) => {
    const idx = owner.indexOf(node);
    if (idx !== -1) owner[idx] = real;
  });
}
