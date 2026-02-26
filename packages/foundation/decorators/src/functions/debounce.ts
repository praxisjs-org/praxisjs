export function Debounce(ms: number) {
  const timers = new WeakMap<object, ReturnType<typeof setTimeout>>();

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
        const bound = (...args: unknown[]) => {
          const existing = timers.get(this);
          if (existing !== undefined) clearTimeout(existing);

          const timer = setTimeout(() => {
            timers.delete(this);
            originalMethod.apply(this, args);
          }, ms);

          timers.set(this, timer);
        };
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
