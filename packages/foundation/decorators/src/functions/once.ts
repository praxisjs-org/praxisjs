export function Once() {
  const called = new WeakMap<object, boolean>();
  const results = new WeakMap<object, unknown>();

  return function (
    _target: object,
    _methodKey: string,
    descriptor: PropertyDescriptor,
  ): PropertyDescriptor {
    const originalMethod = descriptor.value as (...args: unknown[]) => unknown;

    descriptor.value = function (this: object, ...args: unknown[]) {
      if (called.get(this)) return results.get(this);
      const result = originalMethod.apply(this, args);
      called.set(this, true);
      results.set(this, result);
      return result;
    };

    return descriptor;
  };
}
