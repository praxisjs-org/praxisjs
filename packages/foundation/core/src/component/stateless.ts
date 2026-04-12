import type { Children } from "@praxisjs/shared";

import { RootComponent } from "./base";

type StatelessComponentType<T> = T & { children?: Children };

export abstract class StatelessComponent<
  T extends object = Record<never, never>,
> extends RootComponent<StatelessComponentType<T>> {
  _setProps(props: Record<string, unknown>) {
    Object.keys(this._rawProps).forEach((k) => {
      Reflect.deleteProperty(this._rawProps, k);
    });
    Object.assign(this._rawProps, props);
  }
}
