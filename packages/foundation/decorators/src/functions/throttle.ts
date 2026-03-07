import type { StatefulComponent } from "@praxisjs/core";

export function Throttle(ms: number) {
  const lastRun = new WeakMap<object, number>();

  return function (
    value: (this: object, ...args: unknown[]) => unknown,
    context: ClassMethodDecoratorContext<StatefulComponent>,
  ): void {
    context.addInitializer(function (this: unknown) {
      const instance = this as object;
      const name = context.name as string;
      const bound = (...args: unknown[]) => {
        const now = Date.now();
        const last = lastRun.get(instance) ?? 0;

        if (now - last < ms) return;

        lastRun.set(instance, now);
        return value.apply(instance, args);
      };
      Object.defineProperty(instance, name, {
        value: bound,
        configurable: true,
        writable: true,
      });
    });
  };
}
