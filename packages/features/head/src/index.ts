import { effect, type RootComponent  } from "@praxisjs/core/internal";
import {
  createClassDecorator,
  ClassBehavior,
  type ClassEnhancement,
} from "@praxisjs/decorators";

import { pushHead, removeHead, type HeadConfig, type MetaTag, headVersion } from "./head-stack";

export type { HeadConfig, MetaTag };
export { headVersion };

class HeadBehavior extends ClassBehavior {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(private readonly getter: (self: any) => HeadConfig) {
    super();
  }

  create(instance: RootComponent): ClassEnhancement {
    const id = Symbol();
    const getter = this.getter;
    let stop: (() => void) | undefined;

    return {
      onMount() {
        stop = effect(() => {
          pushHead(id, getter(instance));
        });
      },
      onUnmount() {
        stop?.();
        stop = undefined;
        removeHead(id);
      },
    };
  }
}

export function Head(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  config: HeadConfig | ((self: any) => HeadConfig),
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const getter = typeof config === "function" ? (config as (self: any) => HeadConfig) : () => config;
  return createClassDecorator(new HeadBehavior(getter));
}
