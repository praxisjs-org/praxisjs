import type { StatefulComponent } from "@praxisjs/core";

import { lifecycleMethodDecorator } from "../create-lifecycle-method-decorator";
import { readProp } from "./helper";

import type { Command } from "./command";

export function OnCommand(propName: string) {
  return lifecycleMethodDecorator<StatefulComponent>((instance, method) => {
    const command = readProp(instance, propName) as Command<unknown> | undefined;

    if (!command) {
      console.warn(
        `[OnCommand] prop "${propName}" was not provided to ${(instance.constructor as { name?: string }).name ?? "unknown"}`,
      );
      return;
    }

    if (typeof command.subscribe !== "function") {
      console.warn(
        `[OnCommand] prop "${propName}" is not a valid Command in ${(instance.constructor as { name?: string }).name ?? "unknown"}`,
      );
      return;
    }

    return command.subscribe((...args: unknown[]) => { method.apply(instance, args); });
  });
}
