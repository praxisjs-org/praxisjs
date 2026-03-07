export abstract class RootComponent<T extends object = Record<string, never>> {
  /** Props passed by the parent — filled by the renderer when instantiating/updating. */
  readonly _rawProps: T = {} as T;

  /** @internal — becomes `true` after `onMount` fires */
  _mounted = false;

  /** @internal — end comment anchor set by the runtime; used by decorators to locate the parent element */
  _anchor?: Comment;

  constructor(props: T = {} as T) {
    Object.assign(this._rawProps, props);
  }

  get props(): T {
    return this._rawProps;
  }

  onBeforeMount?(): void;
  onMount?(): void;
  onUnmount?(): void;
  onError?(error: Error): void;

  abstract render(): Node | Node[] | null;
}
