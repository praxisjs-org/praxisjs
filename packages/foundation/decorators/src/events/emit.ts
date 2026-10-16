import type { StatefulComponent } from "@praxisjs/core";

import { type AnyMethod, type MethodContext, sharedMethod } from "../shared-method";
import { readProp } from "./helper";

export function Emit(propName: string) {
  return function (value: AnyMethod, context: MethodContext): AnyMethod {
    return sharedMethod(context, value, function (this: StatefulComponent, ...args: unknown[]): unknown {
      const result = value.apply(this, args) as unknown;

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
    });
  };
}
