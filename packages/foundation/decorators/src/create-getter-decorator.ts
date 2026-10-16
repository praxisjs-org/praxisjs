import { assertMemberKind, describeValue } from "./field";
import { addLifecycleHooks, addMountRegistration, type LifecycleCleanup } from "./lifecycle";

type Getter<This = object, Value = unknown> = (this: This) => Value;

/** A getter decorator usable on getters of classes extending `Host` whose type is assignable to `Value`. */
export type GetterDecorator<Host = object, Value = unknown> = <This extends Host, V extends Value>(
  target: (this: This) => V,
  context: ClassGetterDecoratorContext<This, V>,
) => (this: This) => V;

/**
 * What a shared getter decorator installs: `get` (the original getter when absent) and `set` are
 * shared by every instance (`this` is the instance), so per-instance state belongs in symbol slots
 * created in `init`.
 */
export interface GetterSetup<This = object, Value = unknown> {
  get?(this: This): Value;
  set?(this: This, value: Value): void;
  /** Runs once per instance, before the class's fields are initialized. */
  init?: (instance: This) => void;
  onMount?: (instance: This) => void;
  onUnmount?: (instance: This) => void;
}

export interface SharedGetterBehavior<Host = object, Value = unknown> {
  /** Names the decorator in error messages, e.g. `"@Clamp()"`. */
  label?: string;
  /**
   * Runs once per decorated getter, when the class is defined: returns the replacement getter, or
   * a `GetterSetup`.
   */
  setup(
    original: Getter<Host, Value>,
    context: ClassGetterDecoratorContext<Host, Value>,
  ): Getter<Host, Value> | GetterSetup<Host, Value>;
}

export interface SharedWritableGetterBehavior<Host = object, Value = unknown> {
  /** Names the decorator in error messages, e.g. `"@Overridable()"`. */
  label?: string;
  /** Runs once per decorated getter, when the class is defined. */
  setup(original: Getter<Host, Value>, context: ClassGetterDecoratorContext<Host, Value>): GetterSetup<Host, Value>;
}

export interface GetterBehavior<T = object> {
  /** Names the decorator in error messages. */
  label?: string;
  /**
   * Given the original getter and the current instance, returns a function
   * that produces the getter value. Called on every property access.
   */
  wrap(original: (this: object) => unknown, instance: T): () => unknown;
}

export interface WritableGetterBinding {
  get: () => unknown;
  set?: (value: unknown) => void;
}

export interface WritableGetterBehavior<T = object> {
  /** Names the decorator in error messages. */
  label?: string;
  /**
   * Called once per instance during construction. Returns the get/set pair the property reads and
   * writes through for that instance. If `set` is omitted, assigning the property throws a
   * `TypeError`, as for a getter without a setter.
   */
  bind(instance: T, name: string | symbol, original: (this: object) => unknown): WritableGetterBinding;
}

export interface GetterObserverBehavior<T = object, Value = unknown> {
  /** Names the decorator in error messages. */
  label?: string;
  /**
   * Called once per instance, while it is built and before its fields are initialized. Use it to
   * set up observation without changing the getter's value. A function it returns runs when the
   * instance unmounts.
   */
  // eslint-disable-next-line @typescript-eslint/no-invalid-void-type
  observe?(getter: (this: object) => Value, instance: T, name: string): (() => void) | undefined | void;
  /**
   * Called on every mount of each instance, once its fields are set. What it returns (a stop
   * function or an effect) is undone on unmount.
   */
  register?(getter: (this: object) => Value, instance: T, name: string): LifecycleCleanup;
}

// Replacement getter -> the getter it wraps. Lets a setter added by an inner decorator find the
// prototype entry after outer getter decorators replaced its getter again.
const wraps = new WeakMap<Getter, Getter>();

function isFrom(get: Getter | undefined, target: Getter): boolean {
  for (let g = get; g !== undefined; g = wraps.get(g)) if (g === target) return true;
  return false;
}

/**
 * Adds `set` to the class entry of the getter `get`: on the prototype (the class itself for a
 * static getter) where it lives, found from the first instance. Returns false when the getter was
 * not found, i.e. a decorator applied by hand, and defines the pair on `target` alone instead.
 */
// A property descriptor, read as data: its functions are only passed along, never called here.
interface FoundDescriptor {
  get?: Getter;
  enumerable?: boolean;
}

function addSetter(
  target: object,
  context: ClassGetterDecoratorContext,
  get: Getter,
  set: NonNullable<PropertyDescriptor["set"]>,
): boolean {
  const name = context.name;
  let fallback: FoundDescriptor | undefined;
  for (
    let owner = (context.static ? target : Object.getPrototypeOf(target)) as object | null;
    owner !== null;
    owner = Object.getPrototypeOf(owner) as object | null
  ) {
    const descriptor = Object.getOwnPropertyDescriptor(owner, name) as FoundDescriptor | undefined;
    if (descriptor === undefined) continue;
    if (isFrom(descriptor.get, get)) {
      Object.defineProperty(owner, name, { get: descriptor.get, set, enumerable: descriptor.enumerable, configurable: true });
      return true;
    }
    fallback ??= descriptor;
  }
  Object.defineProperty(target, name, { get: fallback?.get ?? get, set, enumerable: false, configurable: true });
  return false;
}

interface SharedGetterLike {
  label?: string;
  setup(original: Getter, context: ClassGetterDecoratorContext): unknown;
}

function sharedGetter(behavior: SharedGetterLike) {
  const label = behavior.label ?? "This getter decorator";
  return function (target: Getter, context: ClassGetterDecoratorContext): Getter {
    assertMemberKind(context, "getter", label);
    const result = behavior.setup(target, context);
    if (typeof result !== "object" && typeof result !== "function") {
      throw new TypeError(`${label}: setup() must return a getter or a GetterSetup object, got ${describeValue(result)}.`);
    }
    if (result === null) {
      throw new TypeError(`${label}: setup() must return a getter or a GetterSetup object, got null.`);
    }
    const spec = (typeof result === "function" ? { get: result } : result) as GetterSetup;
    // eslint-disable-next-line @typescript-eslint/unbound-method -- installed on the class, which calls them with the instance as `this`
    const { get = target, set, init, onMount, onUnmount } = spec;
    if (typeof get !== "function") {
      throw new TypeError(`${label}: setup() returned a "get" that is not a function.`);
    }
    if (get !== target) wraps.set(get, target);
    const hooks = onMount !== undefined || onUnmount !== undefined;
    if (hooks && context.static) {
      throw new TypeError(`${label}: onMount/onUnmount need an instance getter, not the static "${String(context.name)}".`);
    }
    if (set !== undefined || init !== undefined || hooks) {
      let installed = set === undefined;
      context.addInitializer(function (this: unknown) {
        const instance = this as object;
        if (!installed) installed = addSetter(instance, context, get, set as NonNullable<PropertyDescriptor["set"]>);
        init?.(instance);
        if (hooks) addLifecycleHooks(instance, onMount, onUnmount);
      });
    }
    return get;
  };
}

function wrapGetterDecorator(behavior: GetterBehavior) {
  const label = behavior.label ?? "This getter decorator";
  return function <This, T>(target: (this: This) => T, context: ClassGetterDecoratorContext<This, T>): (this: This) => T {
    assertMemberKind(context, "getter", label);
    const getter = function (this: This): T {
      return behavior.wrap(target as (this: object) => unknown, this as object)() as T;
    };
    wraps.set(getter as Getter, target as Getter);
    return getter;
  };
}

/**
 * Builds a getter decorator that changes what a getter returns.
 *
 * With `setup`, the recommended form, the replacement getter is created once per decorated getter
 * and shared by every instance: neither building an instance nor reading the getter allocates.
 *
 * With `wrap`, a function is created on every read.
 */
export function createGetterDecorator<Host = object, Value = unknown>(
  behavior: SharedGetterBehavior<Host, Value>,
): GetterDecorator<Host, Value>;
export function createGetterDecorator(
  behavior: GetterBehavior,
): <This, T>(target: (this: This) => T, context: ClassGetterDecoratorContext<This, T>) => (this: This) => T;
export function createGetterDecorator(behavior: SharedGetterBehavior | GetterBehavior): unknown {
  if (!("setup" in behavior)) return wrapGetterDecorator(behavior);
  return sharedGetter(behavior as SharedGetterLike);
}

function bindWritableGetter(behavior: WritableGetterBehavior) {
  const label = behavior.label ?? "This getter decorator";
  return function <This, T>(target: (this: This) => T, context: ClassGetterDecoratorContext<This, T>): (this: This) => T {
    assertMemberKind(context, "getter", label);
    const name = context.name;
    // Each instance's binding lives in this slot, read through one accessor pair on the class.
    const slot = Symbol(`praxis.getter.${String(name)}`);
    type Host = Record<symbol, WritableGetterBinding | undefined>;
    const original = target as (this: object) => unknown;
    const bindingOf = (instance: Host): WritableGetterBinding =>
      (instance[slot] ??= behavior.bind(instance, name, original));
    const get = function (this: Host): T {
      return bindingOf(this).get() as T;
    };
    const set = function (this: Host, value: unknown): void {
      const write = bindingOf(this).set;
      if (write === undefined) throw new TypeError(`Cannot set property ${String(name)}, which has only a getter.`);
      write(value);
    };
    wraps.set(get as Getter, original);
    let installed = false;
    context.addInitializer(function (this: unknown) {
      const instance = this as Host;
      instance[slot] = behavior.bind(instance, name, original);
      if (!installed) installed = addSetter(instance, context as ClassGetterDecoratorContext, get as Getter, set);
    });
    return get as (this: This) => T;
  };
}

/**
 * Builds a getter decorator that owns writes to the property as well as reads.
 *
 * With `setup`, the recommended form, `get` and `set` are created once per decorated getter and
 * shared by every instance.
 *
 * With `bind`, a get/set pair is created for each instance while it is built.
 */
export function createWritableGetterDecorator<Host = object, Value = unknown>(
  behavior: SharedWritableGetterBehavior<Host, Value>,
): GetterDecorator<Host, Value>;
export function createWritableGetterDecorator(
  behavior: WritableGetterBehavior,
): <This, T>(target: (this: This) => T, context: ClassGetterDecoratorContext<This, T>) => (this: This) => T;
export function createWritableGetterDecorator(
  behavior: SharedWritableGetterBehavior | WritableGetterBehavior,
): unknown {
  if (!("setup" in behavior)) return bindWritableGetter(behavior);
  return sharedGetter(behavior as SharedGetterLike);
}

/**
 * Builds a getter decorator that observes the getter (for logging, devtools, syncing) without
 * changing its value: `observe` runs once per instance while it is built, `register` on every mount.
 */
export function createGetterObserverDecorator<T = object, Value = unknown>(
  behavior: GetterObserverBehavior<T, Value>,
) {
  const label = behavior.label ?? "This getter decorator";
  if (behavior.observe === undefined && behavior.register === undefined) {
    throw new TypeError(`${label}: createGetterObserverDecorator() needs observe() or register().`);
  }
  return function <This extends T, V extends Value>(
    target: (this: This) => V,
    context: ClassGetterDecoratorContext<This, V>,
  ): void {
    assertMemberKind(context, "getter", label);
    const name = context.name as string;
    const getter = target as unknown as (this: object) => Value;
    const observes = behavior.observe !== undefined;
    const mount =
      behavior.register === undefined
        ? undefined
        : (instance: T, read: (this: object) => Value) => behavior.register?.(read, instance, name);
    context.addInitializer(function (this: unknown) {
      const instance = this as T & object;
      if (observes) {
        const cleanup = behavior.observe?.(getter, instance, name);
        if (typeof cleanup === "function") addLifecycleHooks(instance, undefined, cleanup);
      }
      if (mount !== undefined) addMountRegistration(instance, mount, getter);
    });
  };
}
