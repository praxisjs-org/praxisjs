import type { StatefulComponent } from "@praxisjs/core";

import { readProp } from "./helper";

export function Emit(propName: string) {
  return function (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    value: (this: StatefulComponent, ...args: any[]) => any,
    context: ClassMethodDecoratorContext<StatefulComponent>,
  ): void {
    const wrapped = function (
      this: StatefulComponent,
      ...args: unknown[]
    ): unknown {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const result = value.apply(this, args);

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

    context.addInitializer(function (this: unknown) {
      const name = context.name as string;
      const bound = wrapped.bind(this as StatefulComponent);
      Object.defineProperty(this as object, name, {
        value: bound,
        configurable: true,
        writable: true,
      });
    });
  };
}
