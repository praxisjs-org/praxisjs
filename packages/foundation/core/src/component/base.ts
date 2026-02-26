import type { VNode } from "@verbose/shared";

import { setCurrentInstance } from "./lifecycle";

export abstract class BaseComponent {
  /** Props passed by the parent — filled by the renderer when instantiating/updating. */
  readonly _rawProps: Record<string, unknown> = {};

  /** Default values declared in the class. */
  readonly _defaults: Record<string, unknown> = {};

  /** @internal — holds the previous props snapshot so `onAfterUpdate` can compare against them after the renderer commits to the DOM */
  _pendingPreviusProps: Record<string, unknown> | null = null;

  /** @internal — becomes `true` after `onMount` fires; the renderer uses this flag to skip the initial effect run */
  _mounted = false;

  /** @internal — set to true by @State on any write; cleared by renderer after each re-render */
  _stateDirty = false;

  constructor(props: Record<string, unknown> = {}) {
    setCurrentInstance(this);
    Object.assign(this._rawProps, props);
  }

  _setProps(props: Record<string, unknown>) {
    const previous = { ...this._rawProps };
    this.onBeforeUpdate?.(previous);
    Object.keys(this._rawProps).forEach((k) => { Reflect.deleteProperty(this._rawProps, k); });
    Object.assign(this._rawProps, props);
    this._pendingPreviusProps = previous;
    this.onUpdate?.(previous);

    queueMicrotask(() => {
      this.onAfterUpdate?.(previous);
      this._pendingPreviusProps = null;
    });
  }

  get props(): Record<string, unknown> {
    return this._rawProps;
  }

  abstract render(): VNode | null;

  onBeforeMount?(): void;
  onMount?(): void;
  onUnmount?(): void;

  onBeforeUpdate?(prevProps: Record<string, unknown>): void;
  onUpdate?(prevProps: Record<string, unknown>): void;
  onAfterUpdate?(prevProps: Record<string, unknown>): void;

  onError?(error: Error): void;
}
