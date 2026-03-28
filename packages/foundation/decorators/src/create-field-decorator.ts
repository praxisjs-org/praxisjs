import type { StatefulComponent } from "@praxisjs/core";

export interface FieldBinding {
  /** Replaces the decorated property. If absent, the original property is left untouched. */
  descriptor?: PropertyDescriptor;
  /** Extra properties to define on the instance (e.g. companion properties like `nameHistory`). */
  additional?: Record<string, PropertyDescriptor>;
  onMount?: () => void;
  onUnmount?: () => void;
}

export interface FieldBehavior {
  bind(
    instance: StatefulComponent,
    name: string,
    initialValue: unknown,
  ): FieldBinding;
}

export function createFieldDecorator(behavior: FieldBehavior) {
  return function (
    _value: undefined,
    context: ClassFieldDecoratorContext<StatefulComponent>,
  ): void {
    context.addInitializer(function (this: unknown) {
      const instance = this as StatefulComponent & Record<string, unknown>;
      const name = context.name as string;
      const initialValue = instance[name];

      const { descriptor, additional, onMount, onUnmount } = behavior.bind(
        instance,
        name,
        initialValue,
      );

      if (descriptor) {
        Reflect.deleteProperty(instance, name);
        Object.defineProperty(instance, name, {
          enumerable: true,
          configurable: true,
          ...descriptor,
        });
      }

      for (const [key, desc] of Object.entries(additional ?? {})) {
        Object.defineProperty(instance, key, {
          configurable: true,
          ...desc,
        });
      }

      if (onMount ?? onUnmount) {
        const prevMount = instance.onMount?.bind(instance);
        const prevUnmount = instance.onUnmount?.bind(instance);
        instance.onMount = () => {
          prevMount?.();
          onMount?.();
        };
        instance.onUnmount = () => {
          prevUnmount?.();
          onUnmount?.();
        };
      }
    });
  };
}
