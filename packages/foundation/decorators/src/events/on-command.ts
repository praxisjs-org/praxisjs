import type { BaseComponent } from "@verbose/core";

import { readProp } from "./helper";

import type { Command } from "./command";

export function OnCommand(propName: string) {
  return function (
    target: object,
    _methodKey: string,
    descriptor: PropertyDescriptor,
  ): PropertyDescriptor {
    // eslint-disable-next-line @typescript-eslint/unbound-method
    const originalOnMount = (target as { onMount?(): void }).onMount;
    // eslint-disable-next-line @typescript-eslint/unbound-method
    const originalOnUnmount = (target as { onUnmount?(): void }).onUnmount;

    const method = descriptor.value as (...args: unknown[]) => void;
    const cleanups = new WeakMap<object, () => void>();

    (target as { onMount?(): void }).onMount = function (this: BaseComponent) {
      originalOnMount?.call(this);

      const command = readProp(this, propName) as Command<unknown> | undefined;

      if (!command) {
        console.warn(
          `[OnCommand] prop "${propName}" was not provided to ${this.constructor.name}`,
        );
        return;
      }

      if (typeof command.subscribe !== "function") {
        console.warn(
          `[OnCommand] prop "${propName}" is not a valid Command in ${this.constructor.name}`,
        );
        return;
      }

      const bound = method.bind(this);
      const unsub = command.subscribe((...args: unknown[]) => { bound(...args); });
      cleanups.set(this, unsub);
    };

    (target as { onUnmount?(): void }).onUnmount = function (
      this: BaseComponent,
    ) {
      originalOnUnmount?.call(this);
      cleanups.get(this)?.();
      cleanups.delete(this);
    };

    return descriptor;
  };
}
