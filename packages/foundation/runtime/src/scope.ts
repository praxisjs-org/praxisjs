import { createContextEffect, createEffect, disposeEffect, EffectNode, type EffectCleanup } from "@praxisjs/core/internal";
import type { Cleanup } from "@praxisjs/shared/internal";

import { removeListener } from "./dom/events";

type Disposable = Cleanup | { dispose(): void } | EffectNode;

// Thousands of scopes are created per list render (one per row and per reactive child), so a scope
// holds effects and child scopes directly instead of wrapping each in a closure, allocates its
// arrays only when something is registered, and records event listeners as flat triples.
export class Scope {
  private declare items: Disposable[] | null;
  private declare listeners: unknown[] | null;
  /** Bumped by every dispose(): delegated handlers bound in an earlier generation stop firing. */
  declare gen: number;

  // Assigned here rather than as field initializers, which make scopes noticeably slower to create.
  constructor() {
    this.items = null;
    this.listeners = null;
    this.gen = 0;
  }

  effect(fn: () => EffectCleanup): void {
    (this.items ??= []).push(createEffect(fn));
  }

  /** Runs an effect whose shared `fn` keeps its state in `ctx` (see createContextEffect). */
  contextEffect<Ctx>(fn: (this: EffectNode<Ctx>) => EffectCleanup, ctx: Ctx): void {
    (this.items ??= []).push(createContextEffect(fn, ctx));
  }

  add(cleanup: Cleanup | { dispose(): void }): void {
    (this.items ??= []).push(cleanup);
  }

  fork(): Scope {
    const child = new Scope();
    (this.items ??= []).push(child);
    return child;
  }

  /** Records a listener that `removeListener` takes off `el` when the scope is disposed. */
  listen(el: Element, type: string, handler: unknown): void {
    (this.listeners ??= []).push(el, type, handler);
  }

  dispose(): void {
    this.gen++;
    const items = this.items;
    const listeners = this.listeners;
    if (items === null && listeners === null) return;
    this.items = null;
    this.listeners = null;
    let errors: unknown[] | null = null;
    if (listeners !== null) {
      for (let i = 0; i < listeners.length; i += 3) {
        removeListener(listeners[i] as Element, listeners[i + 1] as string, listeners[i + 2]);
      }
    }
    if (items !== null) {
      for (const item of items) {
        try {
          if (typeof item === "function") item();
          else if (item instanceof EffectNode) disposeEffect(item);
          else item.dispose();
        } catch (e) {
          (errors ??= []).push(e);
        }
      }
    }
    if (errors === null) return;
    if (errors.length === 1) throw errors[0];
    throw new AggregateError(errors, "[PraxisJS] Multiple errors during dispose()");
  }
}

// V8 holds map transitions weakly: when every scope dies (a list cleared before a full GC), the
// hidden class its constructor builds dies too, and the optimized code that embedded it is thrown
// away. An unused instance keeps the shape alive; Object.defineProperty keeps bundlers from
// dropping it.
Object.defineProperty(Scope, "shapeKeeper", { value: new Scope() });
