import { selector, type Selector as SelectorFn, type SelectorEquals } from "@praxisjs/core/internal";
import type { Computed } from "@praxisjs/shared";
import { isComputed } from "@praxisjs/shared/internal";

import { type FieldHost, sharedField } from "../field";

export type Selector<K> = SelectorFn<K>;

export interface SelectorOptions<K, T> {
  /**
   * Decides whether `key` is selected for the source value `value`. Defaults to a strict
   * comparison (SameValueZero), which notifies only the previous and next keys; a custom function
   * is evaluated against every key in use whenever the source changes.
   */
  equals?: SelectorEquals<K, T>;
}

function createSelector<K, T>(host: FieldHost, source: string, equals: SelectorEquals<K, T> | undefined): SelectorFn<K> {
  const read = () => {
    const raw = host[source];
    return (isComputed(raw) ? (raw as Computed<unknown>)() : raw) as T;
  };
  return equals ? selector(read, equals) : (selector(read) as unknown as SelectorFn<K>);
}

export function Selector<const Name extends string, K = unknown, T = unknown>(
  source: Name,
  options: SelectorOptions<K, T> = {},
) {
  const decorator = sharedField<object>((name) => {
    const slot = Symbol(`praxis.selector.${name}`);
    return {
      descriptor: {
        // Created on first read, so the source field may be declared after this one.
        get(this: FieldHost) {
          return (this[slot] ??= createSelector(this, source, options.equals));
        },
      },
    };
  });
  return decorator as <This extends Record<Name, unknown>, Value extends Selector<never>>(
    value: undefined,
    context: ClassFieldDecoratorContext<This, Value>,
  ) => void;
}
