export abstract class RootComponent<T extends object = Record<string, never>> {
  /**
   * Props passed by the parent — filled by the renderer when instantiating/updating.
   * @internal
   */
  readonly _rawProps: T = {} as T;

  /**
   * Becomes `true` after `onMount` fires.
   * @internal
   */
  _mounted = false;

  /**
   * End comment anchor set by the runtime; used by decorators to locate the parent element.
   * @internal
   */
  _anchor?: Comment;

  constructor(props: T = {} as T) {
    Object.assign(this._rawProps, props);
  }

  /**
   * Replaces the current props with a new set; called by the renderer on every parent re-render.
   * @internal
   */
  _setProps(props: Record<string, unknown>) {
    Object.keys(this._rawProps).forEach((k) => {
      Reflect.deleteProperty(this._rawProps, k);
    });
    Object.assign(this._rawProps, props);
  }

  get props(): T {
    return this._rawProps;
  }

  onBeforeMount?(): void;
  onMount?(): void;
  onUnmount?(): void;
  // eslint-disable-next-line @typescript-eslint/no-invalid-void-type
  onError?(error: Error): Node | Node[] | null | undefined | void;

  abstract render(): Node | Node[] | null;
}
