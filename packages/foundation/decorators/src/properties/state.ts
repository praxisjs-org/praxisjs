import { markStateDirty, readSignal, SignalNode, writeSignal } from "@praxisjs/core/internal";

import { addClaimableInitializer, assertFieldContext } from "../field";

import type { ReactiveHost } from "../reactive-host";

type StateHost = Record<PropertyKey, unknown>;

export function State() {
  return function <This extends ReactiveHost, Value = unknown>(
    _value: undefined,
    context: ClassFieldDecoratorContext<This, Value>,
  ): void {
    assertFieldContext(context, "@State()");
    const name = context.name;
    // One accessor pair per decorated field, shared by every instance: per-instance closures would
    // give each instance its own hidden class, turning every field read into a megamorphic access.
    // It stays an own property of each instance, so decorators stacked above @State (and custom ones
    // built with createFieldDecorator) find and wrap it, and a Proxy around the instance works.
    const node = Symbol(`praxis.state.${String(name)}`);
    const descriptor: PropertyDescriptor = {
      enumerable: true,
      configurable: true,
      get(this: StateHost) {
        return readSignal(this[node] as SignalNode);
      },
      set(this: StateHost, value: unknown) {
        markStateDirty(this);
        writeSignal(this[node] as SignalNode, value);
      },
    };
    addClaimableInitializer(context, function (value) {
      const instance = this as unknown as StateHost;
      instance[node] = new SignalNode(value);
      Object.defineProperty(instance, name, descriptor);
    });
  };
}
