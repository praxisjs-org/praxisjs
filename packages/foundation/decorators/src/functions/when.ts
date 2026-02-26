import { type BaseComponent, when } from "@verbose/core";
import { isComputed } from "@verbose/shared";

export function When(propName: string) {
  return function (
    target: object,
    _methodKey: string,
    descriptor: PropertyDescriptor,
  ): PropertyDescriptor {
    // eslint-disable-next-line @typescript-eslint/unbound-method
    const originalOnMount = (target as { onMount?(): void }).onMount;
    // eslint-disable-next-line @typescript-eslint/unbound-method
    const originalOnUnmount = (target as { onUnmount?(): void }).onUnmount;

    const method = descriptor.value as (value: unknown) => void;
    const cancels = new WeakMap<object, () => void>();

    (target as { onMount?(): void }).onMount = function (this: BaseComponent) {
      originalOnMount?.call(this);

      const instance = this as unknown as Record<string, unknown>;
      const source = () => {
        const raw = instance[propName];
        return isComputed(raw) ? (raw as unknown as () => unknown)() : raw;
      };

      const cancel = when(source, (value) => {
        method.call(this, value);
      });

      cancels.set(this, cancel);
    };

    (target as { onUnmount?(): void }).onUnmount = function (
      this: BaseComponent,
    ) {
      originalOnUnmount?.call(this);
      cancels.get(this)?.();
      cancels.delete(this);
    };

    return descriptor;
  };
}
