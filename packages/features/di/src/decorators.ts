import type { RootComponent } from "@praxisjs/core/internal";
import { createFieldDecorator, createClassDecorator, ClassBehavior, type FieldBinding, type ClassEnhancement } from "@praxisjs/decorators";

import { container, type Container, Token, type Constructor, type InjectableOptions } from "./container";

// Maps instances to their scoped child containers (set by @Scope).
const scopedContainers = new WeakMap<object, Container>();

function resolveFrom(instance: object) {
  return scopedContainers.get(instance) ?? container;
}

// ── @Injectable ───────────────────────────────────────────────────────────────

class InjectableBehavior extends ClassBehavior {
  constructor(private readonly options: InjectableOptions) {
    super();
  }

  create(_instance: RootComponent): ClassEnhancement {
    return {};
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  initialize(Enhanced: new (...args: any[]) => unknown, _original: new (...args: any[]) => unknown): void {
    container.register(Enhanced as Constructor, this.options);
  }
}

export function Injectable(options: InjectableOptions = {}) {
   
  return createClassDecorator(new InjectableBehavior(options)) as unknown as (value: Constructor, _context: ClassDecoratorContext) => void;
}

// ── @Scope ────────────────────────────────────────────────────────────────────

/**
 * Creates a child DI container scoped to each instance of the decorated class.
 * Services registered in the configure callback are available within the scope,
 * and @Inject / @InjectContainer will resolve from it automatically.
 *
 * @Scope((c) => {
 *   c.register(UserRepository);
 *   c.registerValue(AuthToken, 'abc');
 * })
 * class UserModule extends StatefulComponent {
 *   @Inject(UserRepository) repo!: UserRepository;
 * }
 */
class ScopeBehavior extends ClassBehavior {
  constructor(private readonly configure?: (c: Container) => void) {
    super();
  }

  create(instance: RootComponent): ClassEnhancement {
    const child = container.createChild();
    this.configure?.(child);
    scopedContainers.set(instance as object, child);
    return {};
  }
}

export function Scope(configure?: (c: Container) => void) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return createClassDecorator(new ScopeBehavior(configure)) as unknown as (cls: new (...args: any[]) => any, _ctx: ClassDecoratorContext) => any;
}

// ── @Inject ───────────────────────────────────────────────────────────────────

export function Inject<T>(dep: Constructor<T> | Token<T>) {
  const cache = new WeakMap<object, T>();

  return createFieldDecorator({
    bind(_instance, name, _initialValue): FieldBinding {
      return {
        descriptor: {
          get(this: object): T {
            if (!cache.has(this)) {
              const c = resolveFrom(this);
              let resolved: T;
              try {
                resolved = c.resolve(dep as Constructor<T>);
              } catch (err) {
                throw new Error(
                  `[Inject] Failed to resolve "${
                    dep instanceof Token
                      ? dep.toString()
                      : (dep as Constructor).name
                  }" in "${(this as { constructor: { name: string } }).constructor.name}.${name}": ${(err as Error).message}`,
                );
              }
              cache.set(this, resolved);
            }
            return cache.get(this) as T;
          },
          set(_value: unknown): void {
            if (process.env.NODE_ENV !== "production") {
              console.warn(
                `[Inject] "${name}" is managed by the DI container and cannot be assigned directly.`,
              );
            }
          },
        },
      };
    },
  // DI decorators work on any class, not just StatefulComponent
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  }) as unknown as (_value: undefined, context: ClassFieldDecoratorContext<any>) => void;
}

// ── @InjectContainer ──────────────────────────────────────────────────────────

export function InjectContainer() {
  const cache = new WeakMap<object, Container>();

  return createFieldDecorator({
    bind(_instance, _name, _initialValue): FieldBinding {
      return {
        descriptor: {
          get(this: object) {
            if (!cache.has(this)) {
              cache.set(this, resolveFrom(this));
            }
            return cache.get(this);
          },
        },
      };
    },
  // DI decorators work on any class, not just StatefulComponent
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  }) as unknown as (_value: undefined, context: ClassFieldDecoratorContext<any>) => void;
}
