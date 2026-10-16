import type { RootComponent } from "@praxisjs/core/internal";
import { createClassDecorator, ClassBehavior, type ClassEnhancement, addClaimableInitializer, assertFieldContext } from "@praxisjs/decorators";

import { container, type Container, Token, type Constructor, type InjectableOptions } from "./container";

type Slots = Record<symbol, unknown>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DIFieldDecorator = (_value: undefined, context: ClassFieldDecoratorContext<any>) => void;

// The child container @Scope creates for an instance.
const SCOPE = Symbol("praxis.di.scope");

function resolveFrom(instance: object): Container {
  return ((instance as Slots)[SCOPE] as Container | undefined) ?? container;
}

// ── @Injectable ───────────────────────────────────────────────────────────────

// Registration is all it does, so the class itself is registered rather than a per-instance subclass.
export function Injectable(options: InjectableOptions = {}) {
  return function (value: Constructor, _context: ClassDecoratorContext): void {
    container.register(value, options);
  };
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
    (instance as unknown as Slots)[SCOPE] = child;
    return {};
  }
}

export function Scope(configure?: (c: Container) => void) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return createClassDecorator(new ScopeBehavior(configure)) as unknown as (cls: new (...args: any[]) => any, _ctx: ClassDecoratorContext) => any;
}

// ── @Inject ───────────────────────────────────────────────────────────────────

function depName(dep: Constructor | Token<unknown>): string {
  return dep instanceof Token ? dep.toString() : dep.name;
}

export function Inject<T>(dep: Constructor<T> | Token<T>): DIFieldDecorator {
  return function (_value, context) {
    assertFieldContext(context);
    const name = String(context.name);
    // The resolved service lives on the instance under this symbol; the accessor is shared.
    const slot = Symbol(`praxis.inject.${name}`);
    const descriptor: PropertyDescriptor = {
      get(this: Slots): T {
        const cached = this[slot];
        if (cached !== undefined) return cached as T;
        let resolved: T;
        try {
          resolved = resolveFrom(this).resolve(dep);
        } catch (err) {
          throw new Error(
            `[Inject] Failed to resolve "${depName(dep as Constructor | Token<unknown>)}" in "${(this as { constructor: { name: string } }).constructor.name}.${name}": ${(err as Error).message}`,
          );
        }
        this[slot] = resolved;
        return resolved;
      },
      set(_value: unknown): void {
        if (process.env.NODE_ENV !== "production") {
          console.warn(
            `[Inject] "${name}" is managed by the DI container and cannot be assigned directly.`,
          );
        }
      },
      enumerable: true,
      configurable: true,
    };
    addClaimableInitializer(context, function () {
      // Reserving the slot up front keeps every instance of the class on the same shape.
      (this as Slots)[slot] = undefined;
      Object.defineProperty(this, context.name, descriptor);
    });
  };
}

// ── inject() ──────────────────────────────────────────────────────────────────

export function inject<T>(dep: Constructor<T> | Token<T>): T {
  return container.resolve(dep as Constructor<T>);
}

// ── @InjectContainer ──────────────────────────────────────────────────────────

const containerDescriptor: PropertyDescriptor = {
  get(this: object): Container {
    return resolveFrom(this);
  },
  enumerable: true,
  configurable: true,
};

export function InjectContainer(): DIFieldDecorator {
  return function (_value, context) {
    assertFieldContext(context);
    const name = context.name;
    addClaimableInitializer(context, function () {
      Object.defineProperty(this, name, containerDescriptor);
    });
  };
}
