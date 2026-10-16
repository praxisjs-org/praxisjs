import type { StatefulComponent } from "@praxisjs/core";

import { assertMemberKind } from "./field";
import { addMountRegistration, type LifecycleCleanup } from "./lifecycle";

export type { LifecycleCleanup };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface LifecycleMethodBehavior<T extends object = StatefulComponent, Args extends unknown[] = any[]> {
  /** Names the decorator in error messages, e.g. `"@OnResize()"`. */
  label?: string;
  /**
   * Runs on every mount of each instance with the method bound to it. Returns what undoes the
   * registration on unmount, if anything.
   */
  // eslint-disable-next-line @typescript-eslint/no-invalid-void-type
  register(callback: (...args: Args) => void, instance: T, name: string): (() => void) | undefined | void;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyMethod = (this: any, ...args: any[]) => void;

/**
 * Builds a method decorator that calls `start` on every mount and undoes what it returned on
 * unmount.
 */
export function lifecycleMethodDecorator<T extends object>(
  start: (instance: T, method: AnyMethod, name: string) => LifecycleCleanup,
  label = "This lifecycle method decorator",
) {
  return function (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    value: (this: T, ...args: any[]) => void,
    context: ClassMethodDecoratorContext<T>,
  ): void {
    assertMemberKind(context, "method", label);
    if (context.static) {
      throw new TypeError(`${label} decorates instance methods only, not the static method "${String(context.name)}".`);
    }
    const name = String(context.name);
    const run = (instance: T, method: AnyMethod) => start(instance, method, name);
    context.addInitializer(function (this: T) {
      addMountRegistration(this, run, value);
    });
  };
}

/**
 * Builds a method decorator that registers the method somewhere on every mount (an event listener,
 * a subscription) and undoes it on unmount.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createLifecycleMethodDecorator<T extends object = StatefulComponent, Args extends unknown[] = any[]>(
  behavior: LifecycleMethodBehavior<T, Args>,
): <This extends T>(value: (this: This, ...args: Args) => void, context: ClassMethodDecoratorContext<This>) => void {
  const label = behavior.label ?? "This lifecycle method decorator";
  return lifecycleMethodDecorator<T>(
    (instance, method, name) => behavior.register(method.bind(instance) as (...args: Args) => void, instance, name),
    label,
  ) as never;
}
