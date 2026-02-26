export function Bind() {
  return function (
    _target: object,
    methodKey: string,
    descriptor: PropertyDescriptor,
  ): PropertyDescriptor {
    const originalMethod = descriptor.value as (...args: unknown[]) => unknown;
    return {
      enumerable: false,
      configurable: true,
      get(this: object) {
        const bound = originalMethod.bind(this);
        Object.defineProperty(this, methodKey, {
          value: bound,
          configurable: true,
          writable: true,
        });
        return bound;
      },
    };
  };
}
