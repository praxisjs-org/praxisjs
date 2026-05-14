import type { StatefulComponent } from "@praxisjs/core";
import { effect, batch } from "@praxisjs/core/internal";
import type { Computed } from "@praxisjs/shared";
import { isComputed } from "@praxisjs/shared/internal";

import { createLifecycleMethodDecorator } from "../create-lifecycle-method-decorator";

type BaseComponentKeys = keyof StatefulComponent;

type WatchableKeys<T> = {
  [K in Exclude<keyof T, BaseComponentKeys>]: T[K] extends (
    ...args: infer A
  ) => unknown
    ? A extends []
      ? T[K] extends Computed<unknown>
        ? K
        : never
      : never
    : K;
}[Exclude<keyof T, BaseComponentKeys>] &
  string;

type NoDuplicates<
  Keys extends readonly string[],
  Seen extends string = never,
> = Keys extends readonly [
  infer Head extends string,
  ...infer Rest extends string[],
]
  ? Head extends Seen
    ? [`Error: prop '${Head}' is duplicated`, ...Rest]
    : [Head, ...NoDuplicates<Rest, Seen | Head>]
  : Keys;

type ValidateKeys<
  T extends StatefulComponent,
  Keys extends ReadonlyArray<WatchableKeys<T>>,
> = NoDuplicates<[...Keys]> extends Keys ? Keys : NoDuplicates<[...Keys]>;

type Unwrap<T> =
  T extends Computed<infer U> ? U : T extends () => infer U ? U : T;

export type WatchVal<T extends StatefulComponent, K extends keyof T> = Unwrap<
  T[K]
>;
export type WatchVals<T extends StatefulComponent, K extends keyof T> = {
  [P in K]: Unwrap<T[P]>;
};

function readValue(instance: Record<string, unknown>, key: string): unknown {
  const raw = instance[key];
  return isComputed(raw) ? (raw as Computed<unknown>)() : raw;
}

export function Watch<
  T extends StatefulComponent,
  const Keys extends ReadonlyArray<WatchableKeys<T>>,
>(...propNames: ValidateKeys<T, Keys>) {
  const props = propNames as unknown as string[];

  return createLifecycleMethodDecorator<T>({
    register(callback, instance) {
      const inst = instance as T & Record<string, unknown>;

      if (props.length === 1) {
        let oldVal = readValue(inst, props[0]);
        return effect(() => {
          const newVal = readValue(inst, props[0]);
          if (!Object.is(newVal, oldVal)) {
            callback(newVal, oldVal);
            oldVal = newVal;
          }
        });
      }

      const read = () =>
        Object.fromEntries(props.map((p) => [p, readValue(inst, p)]));
      let oldVals = read();
      let latestVals = oldVals;
      let scheduled = false;
      return effect(() => {
        const newVals = read();
        if (props.some((p) => !Object.is(newVals[p], oldVals[p]))) {
          latestVals = newVals;
          if (!scheduled) {
            scheduled = true;
            const prevVals = oldVals;
            queueMicrotask(() => {
              scheduled = false;
              oldVals = latestVals;
              batch(() => {
                callback(latestVals, prevVals);
              });
            });
          }
        }
      });
    },
  });
}
