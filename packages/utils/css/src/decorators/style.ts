import { effect, signal, type RootComponent } from "@praxisjs/core/internal";
import { createFieldDecorator } from "@praxisjs/decorators";

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
  return createFieldDecorator<object>({
    bind(instance, _name, initialValue) {
      const sig = signal(initialValue as string | number);
      let stopEffect: (() => void) | null = null;

      return {
        descriptor: {
          get() {
            return sig();
          },
          set(v: string | number) {
            sig.set(v);
          },
        },

        onMount() {
          // _anchor is the "[/ComponentName]" comment node inserted by the runtime.
          // Its parentElement is the container where the component lives.
          const el = (instance as unknown as RootComponent)._anchor
            ?.parentElement as HTMLElement | null;
          if (!el) return;

          stopEffect = effect(() => {
            el.style.setProperty(property, String(sig()));
          });
        },

        onUnmount() {
          stopEffect?.();
          stopEffect = null;
          const el = (instance as unknown as RootComponent)._anchor
            ?.parentElement as HTMLElement | null;
          if (el) el.style.removeProperty(property);
        },
      };
    },
  });
}
