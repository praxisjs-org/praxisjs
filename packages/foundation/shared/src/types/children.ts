import type { Computed, Signal } from "./signal";

export type Primitive =
  | string
  | number
  | boolean
  | bigint
  | symbol
  | null
  | undefined;

export type RenderedValue =
  | Primitive
  | Signal<unknown>
  | Computed<unknown>
  | Node
  | Node[];

export type ReactiveChildren = () =>
  | RenderedValue
  | RenderedValue[]
  | ReactiveChildren[];

export type Children = Primitive | Node | ReactiveChildren | Children[];

export type Cleanup = () => void;

export interface ComponentConstructor<P = Record<string, unknown>> {
  new (props: P): ComponentInstance;
  __isComponent: true;
  __isStateless: boolean;
  name: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ComponentElement = new (...args: any[]) => ComponentInstance;

export interface ComponentInstance {
  _mounted: boolean;
  _anchor?: Comment;
  _stateDirty?: boolean;
  _setProps(p: Record<string, unknown>): void;
  render(): Node | Node[] | null;
  onBeforeMount?(): void;
  onMount?(): void;
  onUnmount?(): void;
  onError?(e: Error): void;
}
