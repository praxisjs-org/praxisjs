import type { Children } from "@praxisjs/shared";

import { RootComponent } from "./base";

type StatelessComponentType<T> = T & { children?: Children };

export abstract class StatelessComponent<
  T extends object = Record<never, never>,
> extends RootComponent<StatelessComponentType<T>> {
}
