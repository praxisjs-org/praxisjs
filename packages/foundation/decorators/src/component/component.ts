import { StatelessComponent } from "@praxisjs/core";
import type {
  ComponentConstructor,
  ComponentInstance,
} from "@praxisjs/shared/internal";

export function Component() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return function <T extends new (...args: any[]) => ComponentInstance>(
    constructor: T,
    _context: ClassDecoratorContext,
  ): T & ComponentConstructor {
    const isStateless = constructor.prototype instanceof StatelessComponent;
    const Enhanced = class extends constructor {
      static __isComponent = true as const;
      static __isStateless = isStateless;
    } as unknown as T & ComponentConstructor;

    Object.defineProperty(Enhanced, "name", {
      value: constructor.name,
    });

    return Enhanced;
  };
}
