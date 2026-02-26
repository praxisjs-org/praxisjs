import { signal } from "@verbose/core";
import type { ComponentInstance, Signal } from "@verbose/shared";

export function State() {
  return function (target: object, propertyKey: string) {
    const signalMap = new WeakMap<object, Signal<unknown>>();

    Object.defineProperty(target, propertyKey, {
      get(this: object) {
        if (!signalMap.has(this)) signalMap.set(this, signal(undefined));
        return (signalMap.get(this) as Signal<unknown>)();
      },
      set(this: object, value: unknown) {
        if (!signalMap.has(this)) signalMap.set(this, signal(value));
        else {
          (this as ComponentInstance)._stateDirty = true;
          (signalMap.get(this) as Signal<unknown>).set(value);
        }
      },
      enumerable: true,
      configurable: true,
    });
  };
}
