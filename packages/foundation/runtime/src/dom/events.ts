import { endBatch, startBatch } from "@praxisjs/core/internal";

import { EVENT_MAP } from "./constants";

import type { Scope } from "../scope";

type Handler = (this: Element, event: Event) => unknown;
type HandlerSlot = Handler | Handler[];

const HANDLERS = Symbol("praxis.handlers");

interface HandlerHost {
  [HANDLERS]?: Record<string, HandlerSlot | undefined>;
}

// One shared listener per element and event type dispatches to the handlers stored on the
// element, so binding a handler allocates no wrapper. Handlers run inside a batch so several
// signal writes in one event flush their effects once.
function dispatch(this: Element, event: Event): void {
  const slot = (this as HandlerHost)[HANDLERS]?.[event.type];
  if (slot === undefined) return;
  startBatch();
  try {
    if (typeof slot === "function") {
      slot.call(this, event);
    } else {
      for (const handler of slot.slice()) handler.call(this, event);
    }
  } finally {
    endBatch();
  }
}

export function addEvent(
  el: Element,
  eventName: string,
  handler: EventListener | EventListenerObject | null | undefined,
  scope: Scope,
): void {
  // Components forward optional handlers (`onSubmit={this.onSubmit}`) as-is, and addEventListener
  // has always treated a missing listener as a no-op.
  if (handler == null) return;
  if (typeof handler !== "function") {
    el.addEventListener(eventName, handler);
    scope.add(() => { el.removeEventListener(eventName, handler); });
    return;
  }
  const host = el as HandlerHost;
  const handlers = (host[HANDLERS] ??= {});
  const slot = handlers[eventName];
  if (slot === undefined) {
    // `in` tells a slot emptied by a disposed scope (listener still attached) from a new event type.
    if (!(eventName in handlers)) el.addEventListener(eventName, dispatch);
    handlers[eventName] = handler as Handler;
  } else if (typeof slot === "function") {
    // Same as addEventListener: registering an identical listener twice is a no-op.
    if (slot === handler) return;
    handlers[eventName] = [slot, handler as Handler];
  } else {
    if (slot.includes(handler as Handler)) return;
    slot.push(handler as Handler);
  }
  scope.listen(el, eventName, handler);
}

// ── Delegated binding (compiled templates) ──────────────────────────────────

// A delegated handler is stored on its element under a per-type key, together with the scope that
// bound it and that scope's generation: disposing the scope bumps the generation, which turns the
// handler off without any per-handler cleanup. No listener is attached when it is bound. One capture
// listener per event type, on the document and on every render container, attaches the element's own
// listener the first time an event of that type is on its way to it. Listeners are read when the
// event reaches each node, so the new one runs for that very event, at its own element and phase:
// order, `this`, `currentTarget` and `stopPropagation()` behave exactly as with a listener attached
// at render time. Render containers cover trees that are not in the document.

type DelegatedHost = Record<symbol, unknown>;

const OWNER = Symbol("praxis.owner");
const GENERATION = Symbol("praxis.generation");
export interface DelegatedType {
  /** The event prop (`onClick`), under which a hydration build pass records the handler. */
  key: string;
  type: string;
  /** Holds an element's handler for this type. */
  slot: symbol;
  /** Set once the element's own listener for this type is attached. */
  attached: symbol;
  /** The capture listeners for this type are registered. */
  watched: boolean;
}

// Every event prop maps to its own event type (EVENT_MAP has no two props for one type), so an
// entry is created once per prop and found by type when an event comes in.
const byType = new Map<string, DelegatedType>();
// Keyed by event prop name (`onClick`), so binding a handler costs one lookup. `null` marks a prop
// that is not an event.
const byProp = new Map<string, DelegatedType | null>();
const watched: DelegatedType[] = [];
const roots = new Set<EventTarget>();

/** The delegated event type an event prop binds, or null when `key` is not an event prop. */
export function delegatedProp(key: string): DelegatedType | null {
  let entry = byProp.get(key);
  if (entry === undefined) {
    const type = EVENT_MAP.get(key);
    entry = null;
    if (type !== undefined) {
      entry = { key, type, slot: Symbol(`praxis.on.${type}`), attached: Symbol(`praxis.attached.${type}`), watched: false };
      byType.set(type, entry);
    }
    byProp.set(key, entry);
  }
  return entry;
}

function dispatchDelegated(this: Element, event: Event): void {
  const host = this as unknown as DelegatedHost;
  const handler = host[(byType.get(event.type) as DelegatedType).slot] as Handler | undefined;
  if (handler === undefined || (host[OWNER] as { gen: number }).gen !== host[GENERATION]) return;
  startBatch();
  try {
    handler.call(this, event);
  } finally {
    endBatch();
  }
}

function attachOnDemand(this: EventTarget, event: Event): void {
  const { type, slot, attached } = byType.get(event.type) as DelegatedType;
  for (const node of event.composedPath()) {
    if (node === this) return;
    const host = node as unknown as DelegatedHost;
    if (host[slot] !== undefined && host[attached] === undefined) {
      host[attached] = true;
      node.addEventListener(type, dispatchDelegated);
    }
  }
}

function watchType(entry: DelegatedType): void {
  entry.watched = true;
  watched.push(entry);
  document.addEventListener(entry.type, attachOnDemand, true);
  for (const root of roots) root.addEventListener(entry.type, attachOnDemand, true);
}

/**
 * Registers a render container (or portal target) whose subtree gets delegated handlers even while
 * it is not in the document. Returns the function that unregisters it.
 */
export function addEventRoot(root: EventTarget): () => void {
  roots.add(root);
  for (const entry of watched) root.addEventListener(entry.type, attachOnDemand, true);
  return () => {
    roots.delete(root);
    for (const entry of watched) root.removeEventListener(entry.type, attachOnDemand, true);
  };
}

/**
 * Binds `handler` for the event of `entry` (see delegatedProp) on `el` without attaching a
 * listener now (see above). Falls back to addEvent when no render container is registered (an
 * element mounted outside render()), when the element already has a delegated handler for this
 * type, or when it was bound by another scope.
 */
export function addDelegatedEvent(el: Element, entry: DelegatedType, handler: unknown, scope: Scope & { gen: number }): void {
  if (handler == null) return;
  const host = el as unknown as DelegatedHost;
  const key = entry.slot;
  if (
    roots.size === 0 ||
    typeof handler !== "function" ||
    host[key] !== undefined ||
    (host[OWNER] !== undefined && host[OWNER] !== scope)
  ) {
    addEvent(el, entry.type, handler as EventListener, scope);
    return;
  }
  if (!entry.watched) watchType(entry);
  host[key] = handler;
  host[OWNER] = scope;
  host[GENERATION] = scope.gen;
}

export function removeListener(el: Element, eventName: string, handler: unknown): void {
  const handlers = (el as HandlerHost)[HANDLERS];
  const slot = handlers?.[eventName];
  if (handlers === undefined || slot === undefined) return;
  if (typeof slot === "function") {
    if (slot !== handler) return;
    // The shared listener stays registered: with an empty slot it does nothing, and leaving it
    // saves a native call per handler when thousands of rows are disposed at once.
    handlers[eventName] = undefined;
    return;
  }
  const index = slot.indexOf(handler as Handler);
  if (index === -1) return;
  slot.splice(index, 1);
  if (slot.length === 1) handlers[eventName] = slot[0];
}
