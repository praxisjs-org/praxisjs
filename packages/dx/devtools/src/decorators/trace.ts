import type { RootComponent } from "@praxisjs/core/internal";
import {
  createClassDecorator,
  ClassBehavior,
  type ClassEnhancement,
} from "@praxisjs/decorators";

import { Registry } from "../core/registry";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyConstructor = new (...args: any[]) => any;

const EXTRA_HOOKS = ["onBeforeUpdate", "onUpdate", "onAfterUpdate"] as const;

/**
 * Instruments a component class to report renders and lifecycle events
 * to the devtools panel.
 *
 * @Trace()
 * @Component()
 * class MyComponent extends StatefulComponent { ... }
 */
class TraceBehavior extends ClassBehavior {
  create(instance: RootComponent): ClassEnhancement {
    const registry = Registry.instance;

    return {
      onMount() {
        registry.recordLifecycle(instance, "onMount");
      },
      onUnmount() {
        registry.recordLifecycle(instance, "onUnmount");
      },
      render(originalRender) {
        const start = performance.now();
        const result = originalRender();
        const duration = performance.now() - start;
        registry.recordRender(instance, duration);
        return result;
      },
    };
  }

  initialize(Enhanced: AnyConstructor, original: AnyConstructor): void {
    const name = original.name;
    const registry = Registry.instance;
    const proto = Enhanced.prototype as Record<string, unknown>;

    // onBeforeMount — also registers the component instance
    const originalOnBeforeMount = proto.onBeforeMount as ((...args: unknown[]) => unknown) | undefined;
    proto.onBeforeMount = function (this: object, ...args: unknown[]) {
      registry.registerComponent(this, name);
      registry.recordLifecycle(this, "onBeforeMount");
      return originalOnBeforeMount?.call(this, ...args);
    };

    for (const hook of EXTRA_HOOKS) {
      const orig = proto[hook] as ((...args: unknown[]) => unknown) | undefined;
      proto[hook] = function (this: object, ...args: unknown[]) {
        registry.recordLifecycle(this, hook);
        return orig?.call(this, ...args);
      };
    }
  }
}

const traceBehavior = new TraceBehavior();

export function Trace() {
  return createClassDecorator(traceBehavior);
}
