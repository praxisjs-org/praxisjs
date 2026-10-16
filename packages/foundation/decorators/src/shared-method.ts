// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyMethod = (this: any, ...args: any[]) => any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type MethodContext = ClassMethodDecoratorContext<any, any>;

// Replacements installed through sharedMethod, and the ones an outer decorator wrapped again. Only
// read while decorating and while building the first instance of a class.
const shared = new WeakSet<AnyMethod>();
const superseded = new WeakSet<AnyMethod>();

function isPrototype(object: object): boolean {
  // Class prototypes own their `constructor`; instances inherit it.
  return Object.hasOwn(object, "constructor");
}

function ownerOf(object: object, name: PropertyKey): object | null {
  let owner: object | null = object;
  while (owner !== null && !Object.hasOwn(owner, name)) owner = Object.getPrototypeOf(owner) as object | null;
  return owner;
}

function defineOwnMethod(object: object, name: PropertyKey, value: unknown): void {
  Object.defineProperty(object, name, { value, configurable: true, writable: true });
}

/**
 * Returns `method`, the decorator's replacement for `value`, set up so that reading it from an
 * instance returns it bound to that instance, the same function on every read: detached calls
 * (`onClick={this.save}`) keep working. `method` is shared by every instance and keeps any
 * per-instance state in symbol slots.
 *
 * Rather than defining a bound wrapper on each instance as it is built, the first instance turns
 * the method's prototype entry into an accessor: an instance pays for its bound copy only when the
 * method is first read from it, and nothing if it never is.
 */
export function sharedMethod<F extends AnyMethod>(
  context: MethodContext,
  value: AnyMethod,
  method: F = value as F,
): F {
  if (value === method) {
    // @Bind over a decorator that already binds: nothing left to do.
    if (shared.has(method)) return method;
  } else {
    // The inner decorator's replacement now only runs through this one, which does the binding.
    superseded.add(value);
  }
  shared.add(method);
  // `this.#method` can't be read detached through a property, so there is nothing to bind.
  if (context.private) return method;

  const name = context.name;
  let installed = false;
  let home: object | undefined;

  const accessor: PropertyDescriptor = {
    configurable: true,
    enumerable: false,
    get(this: object | undefined) {
      // Read from a prototype, or through `super.method()` from a subclass override: caching a
      // bound copy on the instance would then shadow the override. Read with no receiver at all,
      // as `vi.spyOn(instance, name)` does with a getter it finds on the prototype: the spy then
      // wraps the method itself, which takes `this` from each call.
      if (this == null || isPrototype(this) || ownerOf(this, name) !== home) return method;
      const bound = method.bind(this);
      defineOwnMethod(this, name, bound);
      return bound;
    },
    set(this: object, next: unknown) {
      defineOwnMethod(this, name, next);
    },
  };

  context.addInitializer(function (this: unknown) {
    if (installed) return;
    const target = this as object;
    if (superseded.has(method)) {
      installed = true;
      return;
    }
    if (!context.static) {
      for (
        let proto = Object.getPrototypeOf(target) as object | null;
        proto !== null;
        proto = Object.getPrototypeOf(proto) as object | null
      ) {
        if (Object.getOwnPropertyDescriptor(proto, name)?.value === method) {
          installed = true;
          home = proto;
          Object.defineProperty(proto, name, accessor);
          return;
        }
      }
    }
    // A static method (bound to its class, as before), or a decorator applied by hand whose
    // replacement never reached a prototype: bind it on the object itself.
    defineOwnMethod(target, name, method.bind(target));
  });

  return method;
}
