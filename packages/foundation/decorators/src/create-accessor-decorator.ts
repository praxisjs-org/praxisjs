export interface AccessorBinding {
  get: () => unknown;
  set?: (value: unknown) => void;
}

export interface AccessorBehavior {
  /**
   * Called once per instance on first access. `initialValue` is the value
   * provided by the `accessor` field initializer (e.g. `accessor count = 0`).
   * Returns the get/set pair used by the accessor.
   */
  bind(instance: object, name: string | symbol, initialValue: unknown): AccessorBinding;
}

export function createAccessorDecorator(behavior: AccessorBehavior) {
  return function <This extends object, V>(
    _target: ClassAccessorDecoratorTarget<This, V>,
    context: ClassAccessorDecoratorContext<This, V>,
  ): ClassAccessorDecoratorResult<This, V> {
    const bindings = new WeakMap<object, AccessorBinding>();
    const initValues = new WeakMap<object, unknown>();

    function getBinding(instance: object): AccessorBinding {
      let b = bindings.get(instance);
      if (!b) {
        b = behavior.bind(instance, context.name, initValues.get(instance));
        bindings.set(instance, b);
      }
      return b;
    }

    return {
      init(this: This, value: V): V {
        initValues.set(this as object, value);
        return value;
      },
      get(this: This): V {
        return getBinding(this as object).get() as V;
      },
      set(this: This, value: V): void {
        getBinding(this as object).set?.(value as unknown);
      },
    };
  };
}
