export interface LifecycleHost {
  onMount?(): void;
  onUnmount?(): void;
}

/**
 * Per-instance state of a decorated field that needs mount/unmount hooks. The hooks themselves
 * are shared per decorated field and find this state through a symbol slot, so chaining onto
 * the instance's own `onMount`/`onUnmount` allocates no closures.
 */
export class HookedField {
  readonly prevMount: (() => void) | undefined;
  readonly prevUnmount: (() => void) | undefined;

  constructor(instance: LifecycleHost) {
    // eslint-disable-next-line @typescript-eslint/unbound-method -- called back with `.call(instance)`
    this.prevMount = instance.onMount;
    // eslint-disable-next-line @typescript-eslint/unbound-method -- called back with `.call(instance)`
    this.prevUnmount = instance.onUnmount;
  }
}
