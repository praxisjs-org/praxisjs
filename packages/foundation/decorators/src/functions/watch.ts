import { type BaseComponent, effect } from "@verbose/core";
import { type Computed, isComputed } from "@verbose/shared";

type BaseComponentKeys = keyof BaseComponent;

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
  T extends BaseComponent,
  Keys extends ReadonlyArray<WatchableKeys<T>>,
> = NoDuplicates<[...Keys]> extends Keys ? Keys : NoDuplicates<[...Keys]>;

type Unwrap<T> =
  T extends Computed<infer U> ? U : T extends () => infer U ? U : T;

export type WatchVal<T extends BaseComponent, K extends keyof T> = Unwrap<T[K]>;
export type WatchVals<T extends BaseComponent, K extends keyof T> = {
  [P in K]: Unwrap<T[P]>;
};

function readValue(instance: Record<string, unknown>, key: string): unknown {
  const raw = instance[key];
  return isComputed(raw) ? (raw as Computed<unknown>)() : raw;
}

function injectOnMount(
  target: object,
  fn: (this: Record<string, unknown>) => void,
): void {
  const t = target as { onMount?: () => void };
  const originalMethod = t.onMount;
  t.onMount = function (this: Record<string, unknown>) {
    originalMethod?.call(this);
    fn.call(this);
  };
}

export function Watch<
  T extends BaseComponent,
  const Keys extends ReadonlyArray<WatchableKeys<T>>,
>(...propNames: ValidateKeys<T, Keys>) {
  return function (
    target: T,
    _key: string,
    descriptor: PropertyDescriptor,
  ): PropertyDescriptor {
    const props = propNames as unknown as string[];
    const method = descriptor.value as (this: Record<string, unknown>, ...args: unknown[]) => void;

    injectOnMount(target, function (this) {
      if (props.length === 1) {
        let oldVal = readValue(this, props[0]);
        effect(() => {
          const newVal = readValue(this, props[0]);
          if (!Object.is(newVal, oldVal)) {
            method.call(this, newVal, oldVal);
            oldVal = newVal;
          }
        });
      } else {
        const read = () =>
          Object.fromEntries(props.map((p) => [p, readValue(this, p)]));
        let oldVals = read();
        effect(() => {
          const newVals = read();
          if (props.some((p) => !Object.is(newVals[p], oldVals[p]))) {
            method.call(this, newVals, oldVals);
            oldVals = newVals;
          }
        });
      }
    });

    return descriptor;
  };
}
