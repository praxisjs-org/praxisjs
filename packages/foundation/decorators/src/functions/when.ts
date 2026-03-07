import type { StatefulComponent } from "@praxisjs/core";
import { when } from "@praxisjs/core/internal";
import type { Computed, Signal } from "@praxisjs/shared";
import { isComputed } from "@praxisjs/shared/internal";

export function When(propName: string) {
  return function (
    value: (this: StatefulComponent, val: unknown) => void,
    context: ClassMethodDecoratorContext<StatefulComponent>,
  ): void {
    const cancels = new WeakMap<object, () => void>();

    context.addInitializer(function (this: unknown) {
      const instance = this as StatefulComponent;
      // eslint-disable-next-line @typescript-eslint/unbound-method
      const originalOnMount = instance.onMount;
      // eslint-disable-next-line @typescript-eslint/unbound-method
      const originalOnUnmount = instance.onUnmount;

      instance.onMount = function (this: StatefulComponent) {
        originalOnMount?.call(this);

        const raw = (this as unknown as Record<string, unknown>)[propName];
        const source = isComputed(raw)
          ? (raw as Computed<unknown>)
          : (raw as Signal<unknown>);

        const cancel = when(source, (val) => {
          value.call(this, val);
        });

        cancels.set(this, cancel);
      };

      instance.onUnmount = function (this: StatefulComponent) {
        originalOnUnmount?.call(this);
        cancels.get(this)?.();
        cancels.delete(this);
      };
    });
  };
}
