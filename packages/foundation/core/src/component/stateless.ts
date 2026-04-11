import type { Children } from "@praxisjs/shared";

import { RootComponent } from "./base";

export abstract class StatelessComponent<
  T extends object = Record<string, never>,
> extends RootComponent<T> {
  override get props(): T & { children?: Children } {
    return this._rawProps as T & { children?: Children };
  }

  _setProps(props: Record<string, unknown>) {
    Object.keys(this._rawProps).forEach((k) => {
      Reflect.deleteProperty(this._rawProps, k);
    });
    Object.assign(this._rawProps, props);
  }
}
