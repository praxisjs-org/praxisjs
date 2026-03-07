import type { StatefulComponent } from "@praxisjs/core";

export function Once() {
  const called = new WeakMap<object, boolean>();
  const results = new WeakMap<object, unknown>();

  return function (
    value: (this: object, ...args: unknown[]) => unknown,
    _context: ClassMethodDecoratorContext<StatefulComponent>,
  ): (this: object, ...args: unknown[]) => unknown {
    return function (this: object, ...args: unknown[]) {
      if (called.get(this)) return results.get(this);
      const result = value.apply(this, args);
      called.set(this, true);
      results.set(this, result);
      return result;
    };
  };
}
