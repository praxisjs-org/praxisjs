import { StatelessComponent } from "@praxisjs/core";
import type { RootComponent } from "@praxisjs/core/internal";
import type {
  ComponentConstructor,
  ComponentInstance,
} from "@praxisjs/shared/internal";

import {
  ClassBehavior,
  createClassDecorator,
  type ClassEnhancement,
} from "../create-class-decorator";

class ComponentBehavior extends ClassBehavior {
  create(_instance: RootComponent): ClassEnhancement {
    return {};
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  initialize(Enhanced: new (...args: any[]) => unknown, original: new (...args: any[]) => unknown): void {
    const isStateless = (original.prototype as object) instanceof StatelessComponent;
    Object.defineProperty(Enhanced, "__isComponent", { value: true, configurable: true });
    Object.defineProperty(Enhanced, "__isStateless", { value: isStateless, configurable: true });
  }
}

const behavior = new ComponentBehavior();

export function Component() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return function <T extends new (...args: any[]) => ComponentInstance>(
    constructor: T,
    context: ClassDecoratorContext,
  ): T & ComponentConstructor {
    return createClassDecorator(behavior)(
      constructor as unknown as T & (new(...args: unknown[]) => RootComponent<Record<string, unknown>>),
      context,
    ) as unknown as T & ComponentConstructor;
  };
}
