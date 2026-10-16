import { disposeEffect, type EffectNode } from "@praxisjs/core/internal";

export type LifecycleHook = (instance: object) => void;

export interface LifecycleHost {
  onMount?: ((this: object) => void) | undefined;
  onUnmount?: ((this: object) => void) | undefined;
}

/** What a mount registration leaves to undo on unmount: a stop function or an effect to dispose. */
// eslint-disable-next-line @typescript-eslint/no-invalid-void-type
export type LifecycleCleanup = (() => void) | EffectNode | undefined | void;

/**
 * Runs `mount` / `unmount` (called with the instance) after the instance's current `onMount` /
 * `onUnmount`, and so after the hooks added before them. Calling `instance.onMount()` by hand runs
 * them too.
 *
 * The previous hooks are called with `this` rather than bound to the instance: two closures per
 * hook pair are all this allocates.
 */
export function addLifecycleHooks(
  object: object,
  mount: LifecycleHook | undefined,
  unmount: LifecycleHook | undefined,
): void {
  const instance = object as LifecycleHost;
  const prevMount = instance.onMount;
  const prevUnmount = instance.onUnmount;
  instance.onMount = function (this: object) {
    prevMount?.call(this);
    mount?.(this);
  };
  instance.onUnmount = function (this: object) {
    prevUnmount?.call(this);
    unmount?.(this);
  };
}

function stop(cleanup: LifecycleCleanup): void {
  if (typeof cleanup === "function") cleanup();
  else if (cleanup != null) disposeEffect(cleanup);
}

/**
 * Calls `start(instance, arg)` on every mount and undoes what it returned on unmount. Like
 * `addLifecycleHooks`, it chains onto the instance's hooks with two closures and no bound
 * functions; the cleanup lives in their shared scope.
 */
export function addMountRegistration<T extends object, A>(
  object: T,
  start: (instance: T, arg: A) => LifecycleCleanup,
  arg: A,
): void {
  const instance = object as LifecycleHost;
  const prevMount = instance.onMount;
  const prevUnmount = instance.onUnmount;
  let cleanup: LifecycleCleanup;
  instance.onMount = function (this: object) {
    prevMount?.call(this);
    // A second onMount() without an onUnmount() in between would otherwise leak the first
    // registration, which nothing could stop anymore.
    const previous = cleanup;
    cleanup = undefined;
    stop(previous);
    cleanup = start(this as T, arg);
  };
  instance.onUnmount = function (this: object) {
    prevUnmount?.call(this);
    const previous = cleanup;
    cleanup = undefined;
    stop(previous);
  };
}
