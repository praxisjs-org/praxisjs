import { type HistoryElement, history } from "@praxisjs/core/internal";
import type { Signal } from "@praxisjs/shared";

import { type FieldDecorator, type FieldHost, sharedField } from "../field";
import { addLifecycleHooks } from "../lifecycle";

export type HistoryOf<C, K extends keyof C> = HistoryElement<C[K]>;

function createHistory(host: FieldHost, fieldName: string, limit: number): HistoryElement<unknown> {
  const h = history((() => host[fieldName]) as Signal<unknown>, limit);
  const undo = h.undo.bind(h);
  const redo = h.redo.bind(h);
  h.undo = () => {
    const prev = h.values()[h.values().length - 2];
    if (prev === undefined) return;
    undo();
    host[fieldName] = prev;
  };
  h.redo = () => {
    redo();
    host[fieldName] = h.current();
  };
  return h;
}

export function History(fieldName: string, limit = 50): FieldDecorator {
  return sharedField((name) => {
    const slot = Symbol(`praxis.history.${name}`);
    // The tracking effect would otherwise keep recording a source that outlives the component.
    const destroy = (instance: object) => { ((instance as FieldHost)[slot] as HistoryElement<unknown> | undefined)?.destroy(); };
    return {
      descriptor: {
        enumerable: false,
        // Created on first read, so an instance whose history is never read records nothing.
        get(this: FieldHost) {
          return (this[slot] ??= createHistory(this, fieldName, limit));
        },
      },
      init(instance) {
        addLifecycleHooks(instance, undefined, destroy);
      },
    };
  });
}
