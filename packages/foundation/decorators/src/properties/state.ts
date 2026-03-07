import type { StatefulComponent } from "@praxisjs/core";
import { signal } from "@praxisjs/core/internal";

export function State() {
  return function (
    _value: undefined,
    context: ClassFieldDecoratorContext<StatefulComponent>,
  ): void {
    context.addInitializer(function (this: unknown) {
      const instance = this as StatefulComponent & Record<string, unknown>;
      const name = context.name as string;
      const initialValue = instance[name];
      Reflect.deleteProperty(instance, name);

      const sig = signal(initialValue);

      Object.defineProperty(instance, name, {
        get() {
          return sig();
        },
        set(value: unknown) {
          instance._stateDirty = true;
          sig.set(value);
        },
        enumerable: true,
        configurable: true,
      });
    });
  };
}
