import { RootComponent } from "./base";

export abstract class StatefulComponent extends RootComponent<
  Record<string, unknown>
> {
  /**
   * Default field values declared in the class, used to reset props on update.
   * @internal
   */
  readonly _defaults: Record<string, unknown> = {};

  /**
   * Set to `true` by `@State` on any write; cleared by the renderer after each re-render.
   * @internal
   */
  _stateDirty = false;

}
