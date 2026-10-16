import type { Composable } from "@praxisjs/core";

import { type FieldDecorator, type FieldHost, sharedField } from "../field";
import { addLifecycleHooks } from "../lifecycle";

interface ComposeFactory { __isComposeFactory: true; resolve: (instance: object) => unknown }

/** Wraps a property as a live getter — passes `() => instance[propName]` to the composable. */
export function getter(propName: string): ComposeFactory {
  return {
    __isComposeFactory: true,
    resolve: (instance) => () => (instance as Record<string, unknown>)[propName],
  };
}

function isFactory(value: unknown): value is ComposeFactory {
  return typeof value === "object" && value !== null && "__isComposeFactory" in value;
}

function isReactive(value: unknown): value is () => unknown {
  return (
    typeof value === "function" &&
    ("__isSignal" in (value as object) || "__isComputed" in (value as object))
  );
}

function buildView(bindings: Record<string, unknown>): object {
  const view: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(bindings)) {
    if (isReactive(value)) {
      Object.defineProperty(view, key, {
        get: () => (value as () => unknown)(),
        enumerable: true,
        configurable: true,
      });
    } else {
      view[key] = value;
    }
  }
  return view;
}

export function Compose(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ComposableClass: new (...args: any[]) => Composable,
  ...ctorArgs: unknown[]
): FieldDecorator {
  return sharedField((name) => {
    const composableSlot = Symbol(`praxis.composable.${name}`);
    const viewSlot = Symbol(`praxis.compose.${name}`);
    const composableOf = (instance: object) => (instance as FieldHost)[composableSlot] as Composable;
    const mount = (instance: object) => { composableOf(instance).onMount?.(); };
    const unmount = (instance: object) => { composableOf(instance).onUnmount?.(); };
    return {
      descriptor: {
        get(this: FieldHost) {
          return this[viewSlot];
        },
      },
      init(instance) {
        const resolvedArgs = ctorArgs.map((arg) => {
          if (isFactory(arg)) return arg.resolve(instance);
          if (typeof arg !== "string") return arg;
          const prop = instance[arg];
          return prop !== undefined ? prop : arg;
        });

        const composable = new ComposableClass(...resolvedArgs);
        instance[composableSlot] = composable;
        instance[viewSlot] = buildView(composable.setup());
        const hasMount = typeof composable.onMount === "function";
        const hasUnmount = typeof composable.onUnmount === "function";
        if (hasMount || hasUnmount) {
          addLifecycleHooks(instance, hasMount ? mount : undefined, hasUnmount ? unmount : undefined);
        }
      },
    };
  });
}
