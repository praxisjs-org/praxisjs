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
