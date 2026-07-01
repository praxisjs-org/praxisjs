import type { Children } from "@praxisjs/shared";

import { RootComponent } from "./base";

type StatelessComponentType<T> = T & { children?: Children };

export abstract class StatelessComponent<
  T extends object = Record<never, never>,
> extends RootComponent<StatelessComponentType<T>> {
  /** Public props API for presentational components — see `RootComponent.props`. */
  override get props(): StatelessComponentType<T> {
    return this._rawProps;
  }
}
