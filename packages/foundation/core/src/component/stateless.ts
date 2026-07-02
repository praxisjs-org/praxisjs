import type { Children } from "@praxisjs/shared";

import { RootComponent } from "./base";
import { getComponentProps } from "./internals";

type StatelessComponentType<T> = T & { children?: Children };

export abstract class StatelessComponent<
  T extends object = Record<never, never>,
> extends RootComponent<StatelessComponentType<T>> {
  /** Public props API for presentational components. */
  get props(): StatelessComponentType<T> {
    return getComponentProps(this) as StatelessComponentType<T>;
  }
}
