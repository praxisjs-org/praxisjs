export function Throttle(ms: number) {
  const lastRun = new WeakMap<object, number>();

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
          const now = Date.now();
          const last = lastRun.get(this) ?? 0;

          if (now - last < ms) return;

          lastRun.set(this, now);
          return originalMethod.apply(this, args);
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
