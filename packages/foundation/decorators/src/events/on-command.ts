import type { StatefulComponent } from "@praxisjs/core";

import { readProp } from "./helper";

import type { Command } from "./command";

export function OnCommand(propName: string) {
  return function (
    value: (this: StatefulComponent, ...args: unknown[]) => void,
    context: ClassMethodDecoratorContext<StatefulComponent>,
  ): void {
    const cleanups = new WeakMap<object, () => void>();

    context.addInitializer(function (this: unknown) {
      const instance = this as StatefulComponent;
      // eslint-disable-next-line @typescript-eslint/unbound-method
      const originalOnMount = instance.onMount;
      // eslint-disable-next-line @typescript-eslint/unbound-method
      const originalOnUnmount = instance.onUnmount;

      instance.onMount = function (this: StatefulComponent) {
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

        const bound = value.bind(this);
        const unsub = command.subscribe((...args: unknown[]) => {
          bound(...args);
        });
        cleanups.set(this, unsub);
      };

      instance.onUnmount = function (this: StatefulComponent) {
        originalOnUnmount?.call(this);
        cleanups.get(this)?.();
        cleanups.delete(this);
      };
    });
  };
}
