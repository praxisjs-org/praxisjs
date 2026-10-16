import type { Signal } from "@praxisjs/shared";

import { untrack } from "./effect";
import { createEffect, disposeEffect, readSignal, SignalNode, writeSignal } from "./graph";

export function signal<T>(initialValue: T): Signal<T> {
  const node = new SignalNode(initialValue);

  const s = (() => readSignal(node)) as Signal<T>;
  s.set = (newValue: T) => { writeSignal(node, newValue); };
  s.update = (fn: (prev: T) => T) => { writeSignal(node, fn(node.value)); };
  s.subscribe = (fn: (value: T) => void) => {
    const sub = createEffect(() => {
      const value = readSignal(node);
      untrack(() => { fn(value); });
    });
    return () => { disposeEffect(sub); };
  };
  s.__isSignal = true;
  return s;
}
