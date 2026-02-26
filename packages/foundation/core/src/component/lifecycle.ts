import type { ComponentInstance } from "@verbose/shared";

import type { BaseComponent } from "./base";

export type LifeCycleHook =
  | "onBeforeMount"
  | "onMount"
  | "onBeforeUpdate"
  | "onUpdate"
  | "onAfterUpdate"
  | "onUnmount"
  | "onError";

export const VALID_LIFECYCLE_HOOK_SIGNATURES: Record<LifeCycleHook, string> = {
  onBeforeMount: "(): void",
  onMount: "(): void",
  onUnmount: "(): void",

  onBeforeUpdate: "(prevProps: Record<string, unknown>): void",
  onUpdate: "(prevProps: Record<string, unknown>): void",
  onAfterUpdate: "(prevProps: Record<string, unknown>): void",

  onError: "(error: Error): void",
};

let _currentInstance: BaseComponent | null = null;

export function setCurrentInstance(instance: BaseComponent | null): void {
  _currentInstance = instance;
}

export function createComponent<T extends ComponentInstance>(
  construtor: new (props: Record<string, unknown>) => T,
  props: Record<string, unknown>,
): T {
  const instance = new construtor(props);
  _currentInstance = null;
  return instance;
}

type LifecycleHookFn =
  | (() => void)
  | ((prevProps: Record<string, unknown>) => void)
  | ((error: Error) => void);

function hook(name: keyof BaseComponent, fn: LifecycleHookFn): void {
  const instance = _currentInstance;
  if (!instance) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(`[${name}] Called outside of a component context.`);
    }
    return;
  }

  const existing = instance[name] as ((...args: unknown[]) => void) | undefined;
  const fnCallable = fn as (...args: unknown[]) => void;

  (instance as unknown as Record<string, unknown>)[name] = function (this: BaseComponent, ...args: unknown[]) {
    existing?.apply(this, args);
    fnCallable.apply(this, args);
  };
}

export function onBeforeMount(fn: () => void): void {
  hook("onBeforeMount", fn);
}

export function onMount(fn: () => void): void {
  hook("onMount", fn);
}

export function onUnmount(fn: () => void): void {
  hook("onUnmount", fn);
}

export function onBeforeUpdate(
  fn: (prevProps: Record<string, unknown>) => void,
): void {
  hook("onBeforeUpdate", fn);
}

export function onUpdate(
  fn: (prevProps: Record<string, unknown>) => void,
): void {
  hook("onUpdate", fn);
}

export function onAfterUpdate(
  fn: (prevProps: Record<string, unknown>) => void,
): void {
  hook("onAfterUpdate", fn);
}

export function onError(fn: (error: Error) => void): void {
  hook("onError", fn);
}
