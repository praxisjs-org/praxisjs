import type { StatefulComponent } from "@praxisjs/core";
import { effect } from "@praxisjs/core/internal";
import type { Computed } from "@praxisjs/shared";
import { isComputed } from "@praxisjs/shared/internal";

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
  return function (
    value: (this: T, ...args: unknown[]) => void,
    context: ClassMethodDecoratorContext<T>,
  ): void {
    const props = propNames as unknown as string[];

    context.addInitializer(function (this: unknown) {
      const instance = this as T & Record<string, unknown>;
      // eslint-disable-next-line @typescript-eslint/unbound-method
      const originalOnMount = instance.onMount;
      // eslint-disable-next-line @typescript-eslint/unbound-method
      const originalOnUnmount = instance.onUnmount;
      let stopEffect: (() => void) | undefined;

      instance.onMount = function (this: T & Record<string, unknown>) {
        originalOnMount?.call(this);

        if (props.length === 1) {
          let oldVal = readValue(this, props[0]);
          stopEffect = effect(() => {
            const newVal = readValue(this, props[0]);
            if (!Object.is(newVal, oldVal)) {
              value.call(this as T, newVal, oldVal);
              oldVal = newVal;
            }
          });
        } else {
          const read = () =>
            Object.fromEntries(props.map((p) => [p, readValue(this, p)]));
          let oldVals = read();
          stopEffect = effect(() => {
            const newVals = read();
            if (props.some((p) => !Object.is(newVals[p], oldVals[p]))) {
              value.call(this as T, newVals, oldVals);
              oldVals = newVals;
            }
          });
        }
      };

      instance.onUnmount = function (this: T) {
        originalOnUnmount?.call(this);
        stopEffect?.();
        stopEffect = undefined;
      };
    });
  };
}
