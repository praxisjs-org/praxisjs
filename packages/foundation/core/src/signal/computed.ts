import type { Computed, WritableComputed } from "@praxisjs/shared";

import { untrack } from "./effect";
import { ComputedNode, createEffect, DIRTY, disposeEffect, readComputed, unlinkDeps } from "./graph";

export function computed<T>(getter: () => T): Computed<T> {
  const node = new ComputedNode(getter);

  const c = (() => readComputed(node)) as Computed<T> & { dispose(): void };

  // Drops this computed's subscriptions to its sources so an unreachable one (e.g. an evicted
  // @Memo entry) isn't kept alive by the signals it read. Does nothing while anything still
  // depends on it: detaching then would leave those dependents silently stale.
  c.dispose = () => {
    if (node.subs !== undefined) return;
    unlinkDeps(node);
    node.flags |= DIRTY;
    node.value = undefined;
  };

  c.subscribe = (fn: (value: T) => void) => {
    const sub = createEffect(() => {
      const value = readComputed(node);
      untrack(() => { fn(value); });
    });
    return () => { disposeEffect(sub); };
  };

  c.__isComputed = true;
  return c;
}

export function writableComputed<T>(getter: () => T, setter: (value: T) => void): WritableComputed<T> {
  const c = computed(getter) as WritableComputed<T>;
  c.set = setter;
  c.update = (updater) => { setter(updater(c())); };
  c.__isWritableComputed = true;
  return c;
}
