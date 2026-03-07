import type { StatefulComponent } from "@praxisjs/core";

export function Debounce(ms: number) {
  const timers = new WeakMap<object, ReturnType<typeof setTimeout>>();

  return function (
    value: (this: object, ...args: unknown[]) => unknown,
    context: ClassMethodDecoratorContext<StatefulComponent>,
  ): void {
    context.addInitializer(function (this: unknown) {
      const instance = this as object;
      const name = context.name as string;
      const bound = (...args: unknown[]) => {
        const existing = timers.get(instance);
        if (existing !== undefined) clearTimeout(existing);

        const timer = setTimeout(() => {
          timers.delete(instance);
          value.apply(instance, args);
        }, ms);

        timers.set(instance, timer);
      };
      Object.defineProperty(instance, name, {
        value: bound,
        configurable: true,
        writable: true,
      });
    });
  };
}
