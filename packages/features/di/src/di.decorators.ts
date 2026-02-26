import { container, type Container, Token, type Constructor, type InjectableOptions  } from "./container";

export function Injectable(options: InjectableOptions = {}) {
  return function <T extends Constructor>(target: T): T {
    container.register(target, options);
    return target;
  };
}

export function Inject<T>(dep: Constructor<T> | Token<T>) {
  const cache = new WeakMap<object, T>();

  return function (target: object, propertyKey: string): void {
    Object.defineProperty(target, propertyKey, {
      get(this: object): T {
        if (!cache.has(this)) {
          let resolved: T;
          try {
            resolved = container.resolve(dep as Constructor<T>);
          } catch (err) {
            throw new Error(
              `[Inject] Failed to resolve "${
                dep instanceof Token
                  ? dep.toString()
                  : (dep as Constructor).name
              }" in "${(this as { constructor: { name: string } }).constructor.name}.${propertyKey}": ${(err as Error).message}`,
            );
          }
          cache.set(this, resolved);
        }
        return cache.get(this) as T;
      },

      set(_value: unknown): void {
        if (process.env.NODE_ENV !== "production") {
          console.warn(
            `[Inject] "${propertyKey}" is managed by the DI container and cannot be assigned directly.`,
          );
        }
      },

      enumerable: true,
      configurable: true,
    });
  };
}

export function InjectContainer() {
  return function (target: object, propertyKey: string): void {
    Object.defineProperty(target, propertyKey, {
      get() {
        return container;
      },
      enumerable: true,
      configurable: true,
    });
  };
}

export function useService<T>(dep: Constructor<T> | Token<T>): T {
  return container.resolve(dep as Constructor<T>);
}

export function createScope(configure?: (c: Container) => void): Container {
  const child = container.createChild();
  configure?.(child);
  return child;
}
