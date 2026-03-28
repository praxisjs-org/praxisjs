import type { StatefulComponent } from "@praxisjs/core";

import { createMethodDecorator } from "../create-method-decorator";
import { readProp } from "./helper";

export function Emit(propName: string) {
  return createMethodDecorator({
    wrap(original, instance) {
      const comp = instance as StatefulComponent;
      return (...args: unknown[]) => {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any
        const result = original.apply(instance, args) as any;

        const callback = readProp(comp, propName);
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        if (typeof callback !== "function") return result;

        if (result !== undefined) {
          (callback as (v: unknown) => void)(result);
        } else if (args.length > 0) {
          (callback as (...a: unknown[]) => void)(...args);
        } else {
          (callback as () => void)();
        }

        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return result;
      };
    },
  });
}
