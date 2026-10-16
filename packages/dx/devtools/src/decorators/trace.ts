import type { RootComponent } from "@praxisjs/core/internal";
import {
  createClassDecorator,
  ClassBehavior,
  type ClassEnhancement,
} from "@praxisjs/decorators";

import { Registry } from "../core/registry";

// Read inline (not through a helper): bundlers replace process.env.NODE_ENV at build time, and only a
// literal check lets them drop the instrumentation, and the registry it uses, from production builds.
declare const process: { env: { NODE_ENV?: string } };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyConstructor = new (...args: any[]) => any;

const EXTRA_HOOKS = ["onBeforeUpdate", "onUpdate", "onAfterUpdate"] as const;

/**
 * Instruments a component class to report renders and lifecycle events
 * to the devtools panel.
 *
 * @Trace({ slow: 4 })   // also warn when a render takes more than 4 ms
 * @Component()
 * class MyComponent extends StatefulComponent { ... }
 */
export interface TraceOptions {
  /** Warns in the console when a render of this component takes longer than this many ms. */
  slow?: number;
}

class TraceBehavior extends ClassBehavior {
  constructor(private readonly slow: number | undefined) {
    super();
  }

  create(instance: RootComponent): ClassEnhancement {
    const registry = Registry.instance;
    const slow = this.slow;

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
        if (slow !== undefined && duration > slow) {
          console.warn(
            `[PraxisJS DevTools] <${instance.constructor.name}> rendered in ${duration.toFixed(1)} ms (over ${String(slow)} ms).`,
          );
        }
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

// Created on first use: a module-level instance would keep this class and the registry in
// production bundles, where @Trace() does nothing.
let defaultBehavior: TraceBehavior | undefined;

export function Trace(options: TraceOptions = {}) {
  // Production builds keep the class exactly as declared.
  if (process.env.NODE_ENV === "production") return <T>(constructor: T, _context: ClassDecoratorContext): T => constructor;
  return createClassDecorator(options.slow === undefined ? (defaultBehavior ??= new TraceBehavior(undefined)) : new TraceBehavior(options.slow));
}
