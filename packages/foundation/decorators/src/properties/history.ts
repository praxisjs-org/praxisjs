import { type HistoryElement, history } from "@verbose/core";

export function History(limit = 50) {
  return function (target: object, propertyKey: string): void {
    const historyKey = `${propertyKey}History`;
    const histories = new WeakMap<object, HistoryElement<unknown>>();

    const originalDescriptor = Object.getOwnPropertyDescriptor(
      target,
      propertyKey,
    );

    Object.defineProperty(target, historyKey, {
      get(this: object): HistoryElement<unknown> {
        if (!histories.has(this)) {
          const source = () => {
            const desc =
              Object.getOwnPropertyDescriptor(this, propertyKey) ??
              Object.getOwnPropertyDescriptor(
                Object.getPrototypeOf(this),
                propertyKey,
              );
            return desc?.get?.call(this) as unknown;
          };

          const h = history(source as () => unknown, limit);

          const originalUndo = () => { h.undo(); };
          const originalRedo = () => { h.redo(); };

          h.undo = () => {
            const prev = h.values()[h.values().length - 2];
            if (prev === undefined) return;
            originalUndo();
            (
              Object.getOwnPropertyDescriptor(
                Object.getPrototypeOf(this),
                propertyKey,
              ) ?? originalDescriptor
            )?.set?.call(this, prev);
          };

          h.redo = () => {
            originalRedo();
            const next = h.current();
            (
              Object.getOwnPropertyDescriptor(
                Object.getPrototypeOf(this),
                propertyKey,
              ) ?? originalDescriptor
            )?.set?.call(this, next);
          };

          histories.set(this, h);
        }
        return histories.get(this) as HistoryElement<unknown>;
      },
      enumerable: false,
      configurable: true,
    });
  };
}
