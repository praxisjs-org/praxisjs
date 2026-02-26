import type { ComponentConstructor, ComponentInstance } from "@verbose/shared";

export interface ComponentOptions {
  tag?: string;
  shadow?: boolean;
}

export function Component(_options: ComponentOptions = {}) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return function <T extends new (...args: any[]) => ComponentInstance>(
    constructor: T,
  ): T & ComponentConstructor {
    const Enhanced = class extends constructor {
      static isComponent = true as const;
    } as unknown as T & ComponentConstructor;

    Object.defineProperty(Enhanced, "name", {
      value: constructor.name,
    });

    return Enhanced;
  };
}
