import type { StatefulComponent } from "@praxisjs/core";
import { type HistoryElement, history } from "@praxisjs/core/internal";
import type { Signal } from "@praxisjs/shared";

import { createFieldDecorator } from "../create-field-decorator";

export type WithHistory<T, K extends keyof T> = Record<
  `${string & K}History`,
  HistoryElement<T[K]>
>;

export function History(limit = 50) {
  return createFieldDecorator({
    bind(instance: StatefulComponent, name: string, _initialValue: unknown) {
      const historyKey = `${name}History`;
      const inst = instance as unknown as Record<string, unknown>;
      let h: HistoryElement<unknown> | undefined;

      return {
        // descriptor omitted — @History does not replace the original field
        additional: {
          [historyKey]: {
            get(): HistoryElement<unknown> {
              if (!h) {
                const source = () => inst[name];
                const hInst = history(source as Signal<unknown>, limit);

                const _undo = hInst.undo.bind(hInst);
                const _redo = hInst.redo.bind(hInst);

                hInst.undo = () => {
                  const prev = hInst.values()[hInst.values().length - 2];
                  if (prev === undefined) return;
                  _undo();
                  inst[name] = prev;
                };

                hInst.redo = () => {
                  _redo();
                  inst[name] = hInst.current();
                };

                h = hInst;
              }
              return h;
            },
            enumerable: false,
            configurable: true,
          },
        },
      };
    },
  });
}
