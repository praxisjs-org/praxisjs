import type { StatefulComponent } from "@praxisjs/core";

export interface MethodBehavior {
  wrap(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    original: (...args: any[]) => any,
    instance: object,
    name: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ): (...args: any[]) => any;
}

export function createMethodDecorator(behavior: MethodBehavior) {
  return function (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    value: (this: object, ...args: any[]) => any,
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
