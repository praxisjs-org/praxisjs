import type { StatefulComponent, Composable } from "@praxisjs/core";

import { createFieldDecorator } from "../create-field-decorator";

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
) {
  return createFieldDecorator({
    bind(instance: StatefulComponent, _name: string, _initialValue: unknown) {
      const resolvedArgs = ctorArgs.map((arg) => {
        if (isFactory(arg)) return arg.resolve(instance);
        if (typeof arg !== "string") return arg;
        const prop = (instance as unknown as Record<string, unknown>)[arg];
        return prop !== undefined ? prop : arg;
      });

      const composable = new ComposableClass(...resolvedArgs);
      const view = buildView(composable.setup());

      return {
        descriptor: { get: () => view },
        onMount: composable.onMount?.bind(composable),
        onUnmount: composable.onUnmount?.bind(composable),
      };
    },
  });
}
