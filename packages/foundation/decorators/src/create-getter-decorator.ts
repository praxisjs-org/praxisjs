export interface GetterBehavior {
  /**
   * Given the original getter and the current instance, returns a function
   * that produces the getter value. Called on every property access.
   */
  wrap(
    original: (this: object) => unknown,
    instance: object,
  ): () => unknown;
}

export function createGetterDecorator(behavior: GetterBehavior) {
  return function <This, T>(
    target: (this: This) => T,
    _context: ClassGetterDecoratorContext<This, T>,
  ): (this: This) => T {
    return function (this: This): T {
      return behavior.wrap(
        target as (this: object) => unknown,
        this as object,
      )() as T;
    };
  };
}

export interface WritableGetterBinding {
  get: () => unknown;
  set?: (value: unknown) => void;
}

export interface WritableGetterBehavior {
  /**
   * Called once per instance during construction. Returns the get/set pair
   * that will be installed on the instance via `Object.defineProperty`.
   * If `set` is omitted, the property is read-only at runtime (though TypeScript
   * may still see a setter if one is declared in the class body).
   */
  bind(
    instance: object,
    name: string | symbol,
    original: (this: object) => unknown,
  ): WritableGetterBinding;
}

export function createWritableGetterDecorator(behavior: WritableGetterBehavior) {
  return function <This, T>(
    target: (this: This) => T,
    context: ClassGetterDecoratorContext<This, T>,
  ): (this: This) => T {
    context.addInitializer(function (this: unknown) {
      const instance = this as object;
      const binding = behavior.bind(instance, context.name, target as (this: object) => unknown);
      const descriptor: PropertyDescriptor = {
        get: binding.get,
        configurable: true,
        enumerable: false,
      };
      if (binding.set !== undefined) descriptor.set = binding.set;
      Object.defineProperty(instance, context.name, descriptor);
    });
    return target;
  };
}

export interface GetterObserverBehavior {
  /**
   * Called once per instance when the class is initialized.
   * Use this to set up observation side-effects on the getter without
   * changing its return value (e.g. tracking changes for devtools).
   */
  observe(
    getter: (this: object) => unknown,
    instance: object,
    name: string,
  ): void;
}

export function createGetterObserverDecorator(behavior: GetterObserverBehavior) {
  return function <This, T>(
    target: (this: This) => T,
    context: ClassGetterDecoratorContext<This, T>,
  ): void {
    context.addInitializer(function (this: unknown) {
      behavior.observe(
        target as (this: object) => unknown,
        this as object,
        context.name as string,
      );
    });
  };
}
