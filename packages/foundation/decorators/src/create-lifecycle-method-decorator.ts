import type { StatefulComponent } from "@praxisjs/core";

export interface LifecycleMethodBehavior<
  T extends StatefulComponent = StatefulComponent,
> {
  register(
    callback: (...args: unknown[]) => void,
    instance: T,
  ): (() => void) | undefined;
}

export function createLifecycleMethodDecorator<
  T extends StatefulComponent = StatefulComponent,
>(behavior: LifecycleMethodBehavior<T>) {
  return function (
    value: (this: T, ...args: unknown[]) => void,
    _context: ClassMethodDecoratorContext<T>,
  ): void {
    _context.addInitializer(function (this: unknown) {
      const instance = this as T;
      const prevMount = instance.onMount?.bind(instance);
      const prevUnmount = instance.onUnmount?.bind(instance);
      let cleanup: (() => void) | undefined;

      instance.onMount = function (this: T) {
        prevMount?.call(this);
        const result = behavior.register(value.bind(this), this);
        if (result) cleanup = result;
      };

      instance.onUnmount = function (this: T) {
        prevUnmount?.call(this);
        cleanup?.();
        cleanup = undefined;
      };
    });
  };
}
