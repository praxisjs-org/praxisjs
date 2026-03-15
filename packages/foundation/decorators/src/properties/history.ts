import type { StatefulComponent } from "@praxisjs/core";
import { type HistoryElement, history } from "@praxisjs/core/internal";
import type { Signal } from "@praxisjs/shared";

export type WithHistory<T, K extends keyof T> = Record<
  `${string & K}History`,
  HistoryElement<T[K]>
>;

export function History(limit = 50) {
  return function (
    _value: undefined,
    context: ClassFieldDecoratorContext<StatefulComponent>,
  ): void {
    const histories = new WeakMap<object, HistoryElement<unknown>>();

    context.addInitializer(function (this: unknown) {
      const instance = this as Record<string, unknown>;
      const propertyKey = context.name as string;
      const historyKey = `${propertyKey}History`;

      Object.defineProperty(instance, historyKey, {
        get(this: Record<string, unknown>): HistoryElement<unknown> {
          if (!histories.has(this)) {
            const source = () => this[propertyKey];

            const h = history(source as Signal<unknown>, limit);

            const _undo = h.undo.bind(h);
            const _redo = h.redo.bind(h);

            h.undo = () => {
              const prev = h.values()[h.values().length - 2];
              if (prev === undefined) return;
              _undo();
              this[propertyKey] = prev;
            };

            h.redo = () => {
              _redo();
              this[propertyKey] = h.current();
            };

            histories.set(this, h);
          }
          return histories.get(this) as HistoryElement<unknown>;
        },
        enumerable: false,
        configurable: true,
      });
    });
  };
}
