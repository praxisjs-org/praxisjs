import {
  createEffect,
  disposeEffect,
  getComponentAnchor,
  readSignal,
  SignalNode,
  writeSignal,
  type EffectNode,
} from "@praxisjs/core/internal";
import { addClaimableInitializer, assertFieldContext } from "@praxisjs/decorators";

import { HookedField, type LifecycleHost } from "../internal/lifecycle.js";

class StyleField extends HookedField {
  readonly node: SignalNode<string | number>;
  effect: EffectNode | undefined = undefined;
  el: HTMLElement | undefined = undefined;

  constructor(instance: LifecycleHost, value: string | number) {
    super(instance);
    this.node = new SignalNode(value);
  }
}

/**
 * Reactive field decorator that binds a signal value to a CSS custom property
 * on the component's container element — with zero re-renders.
 *
 * Only CSS custom properties (variables) are supported: the property name must
 * start with `--`.
 *
 * @example
 * class ThemeCard extends StatefulComponent {
 *   @Style('--accent') accent = '#3b82f6'
 *   @Style('--radius') radius = '8px'
 * }
 */
export function Style(property: `--${string}`) {
  return function <This extends object, Value = unknown>(
    _value: undefined,
    context: ClassFieldDecoratorContext<This, Value>,
  ): void {
    assertFieldContext(context);
    const name = context.name;
    // Accessors and hooks are shared by every instance of the decorated field; the instance's
    // own state lives in this slot.
    const slot = Symbol(`praxis.style.${String(name)}`);
    type Host = LifecycleHost & Record<typeof slot, StyleField>;

    const descriptor: PropertyDescriptor = {
      enumerable: true,
      configurable: true,
      get(this: Host) {
        return readSignal(this[slot].node);
      },
      set(this: Host, value: string | number) {
        writeSignal(this[slot].node, value);
      },
    };

    function onMount(this: Host): void {
      const field = this[slot];
      field.prevMount?.call(this);
      const el = getComponentAnchor(this)?.parentElement;
      if (!el) return;
      const node = field.node;
      field.el = el;
      field.effect = createEffect(() => {
        el.style.setProperty(property, String(readSignal(node)));
      });
    }

    function onUnmount(this: Host): void {
      const field = this[slot];
      field.prevUnmount?.call(this);
      if (field.effect) {
        disposeEffect(field.effect);
        field.effect = undefined;
      }
      // The element it was set on, even if the anchor has been detached by now.
      if (field.el) {
        field.el.style.removeProperty(property);
        field.el = undefined;
      }
    }

    addClaimableInitializer(context, function (value) {
      const host = this as unknown as Host & Record<PropertyKey, unknown>;
      host[slot] = new StyleField(host, value as string | number);
      Object.defineProperty(host, name, descriptor);
      host.onMount = onMount;
      host.onUnmount = onUnmount;
    });
  };
}
