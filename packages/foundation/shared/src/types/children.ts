export type Primitive =
  | string
  | number
  | boolean
  | bigint
  | symbol
  | null
  | undefined;

export type ReactiveChildren = () =>
  | Primitive
  | VNode
  | VNode[]
  | ReactiveChildren[];

export type ChildrenInternal =
  | Primitive
  | VNode
  | ReactiveChildren
  | ChildrenInternal[];

export type Children = ChildrenInternal | ChildrenInternal[];

export type Component = FunctionComponent | ComponentConstructor;

export interface VNode {
  type: string | ComponentConstructor | FunctionComponent;
  props: Record<string, unknown>;
  children: ChildrenInternal[];
  key?: string | number;
}

export type FunctionComponent<P = Record<string, unknown>> = (
  props: P & { children?: Children },
) => VNode | null;

export interface ComponentConstructor<P = Record<string, unknown>> {
  new (props: P): ComponentInstance;
  isComponent: true;
}

export interface ComponentInstance {
  _mounted: boolean;
  _stateDirty: boolean;
  _lastResolvedProps?: Record<string, unknown>;
  _isMemorized?: boolean;
  _arePropsEqual?: (
    prevProps: Record<string, unknown>,
    nextProps: Record<string, unknown>,
  ) => boolean;
  _setProps(p: Record<string, unknown>): void;
  render(): VNode | null;
  onBeforeMount?(): void;
  onMount?(): void;
  onUnmount?(): void;
  onError?(e: Error): void;
}
