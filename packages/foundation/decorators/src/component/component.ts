import { StatelessComponent } from "@praxisjs/core";
import type {
  ComponentConstructor,
  ComponentInstance,
} from "@praxisjs/shared/internal";

// @Component only marks the class for the runtime. It adds no behavior, so it marks the class itself
// instead of wrapping it in an enhanced subclass: every instance would otherwise pay for the
// wrapper's per-instance object and per-render closure.
export function Component() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return function <T extends new (...args: any[]) => ComponentInstance>(
    constructor: T,
    _context: ClassDecoratorContext,
  ): T & ComponentConstructor {
    const isStateless = (constructor.prototype as object) instanceof StatelessComponent;
    Object.defineProperty(constructor, "__isComponent", { value: true, configurable: true });
    Object.defineProperty(constructor, "__isStateless", { value: isStateless, configurable: true });
    return constructor as T & ComponentConstructor;
  };
}
