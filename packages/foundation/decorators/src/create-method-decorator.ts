import type { StatefulComponent } from "@praxisjs/core";

export interface MethodBehavior {
  wrap(
    original: (...args: unknown[]) => unknown,
    instance: object,
    name: string,
  ): (...args: unknown[]) => unknown;
}

export function createMethodDecorator(behavior: MethodBehavior) {
  return function (
    value: (this: object, ...args: unknown[]) => unknown,
    context: ClassMethodDecoratorContext<StatefulComponent>,
  ): void {
    context.addInitializer(function (this: unknown) {
      const instance = this as object;
      const name = context.name as string;
      Object.defineProperty(instance, name, {
        value: behavior.wrap(value, instance, name),
        configurable: true,
        writable: true,
      });
    });
  };
}
