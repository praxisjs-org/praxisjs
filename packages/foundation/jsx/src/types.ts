export type Primitive =
  | string
  | number
  | boolean
  | bigint
  | symbol
  | null
  | undefined;

export type ReactiveChildren = Primitive | VNode | VNode[] | ReactiveChildren[];

export type Children = Primitive | VNode | ReactiveChildren | Children[];

export interface VNode {
  type: string | ComponentConstructor | FunctionComponent;
  props: Record<string, unknown>;
  children: Children[];
  key?: string | number;
}

export type FunctionComponent<P = {}> = (
  props: P & { children?: Children[] },
) => VNode | null;

export interface ComponentConstructor<P = {}> {
  new (props: P): ComponentInstance;
  isComponent: true;
  isMemorized?: boolean;
  arePropsEqual: (
    prevProps: Record<string, unknown>,
    nextProps: Record<string, unknown>,
  ) => boolean;
}

export interface ComponentInstance {
  _mounted: boolean;
  _stateDirty: boolean;
  _lastResolvedProps?: Record<string, unknown>;
  _setProps(p: Record<string, unknown>): void;
  render(): VNode | null;
  onBeforeMount?(): void;
  onMount?(): void;
  onUnmount?(): void;
  onError?(e: Error): void;
}
