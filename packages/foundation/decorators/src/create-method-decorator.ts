import type { StatefulComponent } from "@praxisjs/core";

import { assertMemberKind, describeValue } from "./field";
import { addLifecycleHooks } from "./lifecycle";
import { type AnyMethod, sharedMethod } from "./shared-method";

export type { AnyMethod };

export interface MethodBehavior<T = object> {
  /** Names the decorator in error messages, e.g. `"@Confirm()"`. */
  label?: string;
  /**
   * Runs once per instance, while it is built: returns the function that runs in place of the
   * method for that instance.
   */
  wrap(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    original: (...args: any[]) => any,
    instance: T,
    name: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ): (...args: any[]) => any;
}

/** A replacement method, with hooks that run on every mount and unmount of each instance. */
export interface MethodSetup<This = object, M extends AnyMethod = AnyMethod> {
  method: M;
  onMount?: (instance: This) => void;
  onUnmount?: (instance: This) => void;
}

export interface SharedMethodBehavior<Host = object, M extends AnyMethod = AnyMethod> {
  /** Names the decorator in error messages, e.g. `"@Confirm()"`. */
  label?: string;
  /**
   * Runs once per decorated method, when the class is defined: returns the replacement, shared by
   * every instance (`this` is the instance), or a `MethodSetup` that also has lifecycle hooks.
   *
   * `M` is never inferred from it, so a decorator fits every method unless `M` is given.
   */
  setup(
    original: NoInfer<M>,
    context: ClassMethodDecoratorContext<Host, NoInfer<M>>,
  ): NoInfer<M> | MethodSetup<Host, NoInfer<M>>;
}

/** A method decorator usable on methods of classes extending `Host` whose type is assignable to `M`. */
export type MethodDecorator<Host = object, M extends AnyMethod = AnyMethod> = <This extends Host, V extends M>(
  value: V,
  context: ClassMethodDecoratorContext<This, V>,
) => V;

const DEFAULT_LABEL = "This method decorator";

function sharedMethodDecorator<Host, M extends AnyMethod>(
  behavior: SharedMethodBehavior<Host, M>,
): MethodDecorator<Host, M> {
  const label = behavior.label ?? DEFAULT_LABEL;
  return function (value, context) {
    assertMemberKind(context, "method", label);
    const result: unknown = behavior.setup(value, context as unknown as ClassMethodDecoratorContext<Host, M>);
    const setup = typeof result === "object" && result !== null ? (result as MethodSetup) : undefined;
    const method: unknown = setup === undefined ? result : setup.method;
    if (typeof method !== "function") {
      throw new TypeError(`${label}: setup() must return a function or { method }, got ${describeValue(method)}.`);
    }
    if (setup !== undefined && (setup.onMount !== undefined || setup.onUnmount !== undefined)) {
      if (context.static) {
        throw new TypeError(`${label}: onMount/onUnmount need an instance method, not the static "${String(context.name)}".`);
      }
      const { onMount, onUnmount } = setup;
      context.addInitializer(function () {
        addLifecycleHooks(this as object, onMount, onUnmount);
      });
    }
    return sharedMethod(context, value, method as AnyMethod) as typeof value;
  };
}

function wrapMethodDecorator<T>(behavior: MethodBehavior<T>) {
  const label = behavior.label ?? DEFAULT_LABEL;
  return function (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    value: (this: object, ...args: any[]) => any,
    context: ClassMethodDecoratorContext,
  ) {
    assertMemberKind(context, "method", label);
    const name = context.name as string;
    // Each instance's wrapper lives in this slot, called through one replacement on the prototype:
    // no property definition per instance, and decorators stacked around this one keep working.
    const slot = Symbol(`praxis.method.${name}`);
    type Host = Record<symbol, AnyMethod | undefined>;
    const wrapFor = (instance: object): AnyMethod => {
      const wrapped: unknown = behavior.wrap(value, instance as T, name);
      if (typeof wrapped !== "function") {
        throw new TypeError(`${label}: wrap() must return a function, got ${describeValue(wrapped)}.`);
      }
      return wrapped as AnyMethod;
    };
    const method = function (this: Host, ...args: unknown[]): unknown {
      // An object the constructor did not build (Object.create(prototype)) gets its wrapper here.
      return (this[slot] ??= wrapFor(this)).apply(this, args) as unknown;
    };
    context.addInitializer(function () {
      (this as Host)[slot] = wrapFor(this as object);
    });
    return sharedMethod(context, value, method);
  };
}

/**
 * Builds a method decorator.
 *
 * With `setup`, the recommended form, the replacement is created once per decorated method and
 * shared by every instance, which keeps any state in symbol slots: building an instance costs
 * nothing.
 *
 * With `wrap`, a wrapper is created for each instance while it is built.
 *
 * Either way, reading the method from an instance returns it bound to that instance, the same
 * function on every read, so `onClick={this.save}` works.
 */
export function createMethodDecorator<Host = object, M extends AnyMethod = AnyMethod>(
  behavior: SharedMethodBehavior<Host, M>,
): MethodDecorator<Host, M>;
export function createMethodDecorator<T = object>(
  behavior: MethodBehavior<T>,
): (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  value: (this: object, ...args: any[]) => any,
  context: ClassMethodDecoratorContext<StatefulComponent>,
) => void;
export function createMethodDecorator(behavior: SharedMethodBehavior | MethodBehavior): unknown {
  return "setup" in behavior ? sharedMethodDecorator(behavior) : wrapMethodDecorator(behavior);
}
