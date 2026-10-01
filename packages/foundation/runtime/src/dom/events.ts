import { batch } from "@praxisjs/core/internal";

import type { Scope } from "../scope";

// One wrapper per handler keeps addEventListener's dedupe of an identical listener intact.
const batchedHandlers = new WeakMap<EventListener, EventListener>();

// Handlers run inside batch() so several signal writes in one event flush their effects once,
// instead of re-running the same reactive subtree after every write.
function batched(handler: EventListener): EventListener {
  let wrapper = batchedHandlers.get(handler);
  if (!wrapper) {
    wrapper = function (this: Element, event) {
      batch(() => { handler.call(this, event); });
    };
    batchedHandlers.set(handler, wrapper);
  }
  return wrapper;
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
  const listener = typeof handler === "function" ? batched(handler) : handler;
  el.addEventListener(eventName, listener);
  scope.add(() => { el.removeEventListener(eventName, listener); });
}
