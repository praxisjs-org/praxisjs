import type { StatefulComponent } from "@praxisjs/core";
import { type HistoryElement, history } from "@praxisjs/core/internal";
import type { Signal } from "@praxisjs/shared";

import { createFieldDecorator } from "../create-field-decorator";

export type HistoryOf<C, K extends keyof C> = HistoryElement<C[K]>;

export function History(fieldName: string, limit = 50) {
  return createFieldDecorator({
    bind(instance: StatefulComponent, _name: string) {
      const inst = instance as unknown as Record<string, unknown>;
      let h: HistoryElement<unknown> | undefined;

      const source = () => inst[fieldName];

      return {
        descriptor: {
          get(): HistoryElement<unknown> {
            if (!h) {
              const hInst = history(source as Signal<unknown>, limit);
              const _undo = hInst.undo.bind(hInst);
              const _redo = hInst.redo.bind(hInst);
              hInst.undo = () => {
                const prev = hInst.values()[hInst.values().length - 2];
                if (prev === undefined) return;
                _undo();
                inst[fieldName] = prev;
              };
              hInst.redo = () => {
                _redo();
                inst[fieldName] = hInst.current();
              };
              h = hInst;
            }
            return h;
          },
          enumerable: false,
        },
      };
    },
  });
}
