import type { StatefulComponent } from "@praxisjs/core";

export function Bind() {
  return function (
    value: (this: object, ...args: unknown[]) => unknown,
    context: ClassMethodDecoratorContext<StatefulComponent>,
  ): void {
    context.addInitializer(function (this: unknown) {
      const name = context.name as string;
      const bound = value.bind(this as object);
      Object.defineProperty(this as object, name, {
        value: bound,
        configurable: true,
        writable: true,
      });
    });
  };
}
