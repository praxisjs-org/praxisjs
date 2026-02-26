import type { BaseComponent } from "@verbose/core";

import { readProp } from "./helper";

export function Emit(propName: string) {
  return function (
    _target: object,
    methodKey: string,
    descriptor: PropertyDescriptor,
  ): PropertyDescriptor {
    const originalMethod = descriptor.value as (...args: unknown[]) => unknown;

    const wrapped = function (
      this: BaseComponent,
      ...args: unknown[]
    ): unknown {
      const result = originalMethod.apply(this, args);

      const callback = readProp(this, propName);
      if (typeof callback !== "function") return result;

      if (result !== undefined) {
        (callback as (v: unknown) => void)(result);
      } else if (args.length > 0) {
        (callback as (...a: unknown[]) => void)(...args);
      } else {
        (callback as () => void)();
      }

      return result;
    };

    return {
      configurable: true,
      enumerable: false,
      get(this: BaseComponent) {
        const bound = wrapped.bind(this);
        Object.defineProperty(this, methodKey, {
          value: bound,
          configurable: true,
          writable: true,
        });
        return bound;
      },
    };
  };
}
