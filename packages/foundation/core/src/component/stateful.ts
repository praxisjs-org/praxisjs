import { RootComponent } from "./base";

export abstract class StatefulComponent extends RootComponent<
  Record<string, unknown>
> {
  /** Default values declared in the class. */
  readonly _defaults: Record<string, unknown> = {};

  /** @internal — set to true by @State on any write; cleared by renderer after each re-render */
  _stateDirty = false;

  _setProps(props: Record<string, unknown>) {
    Object.keys(this._rawProps).forEach((k) => {
      Reflect.deleteProperty(this._rawProps, k);
    });
    Object.assign(this._rawProps, props);
  }
}
