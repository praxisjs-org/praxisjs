import type { componentPropsType } from "@praxisjs/core/internal";

export const reactiveHostType: unique symbol = Symbol("praxis.reactiveHostType");

export type ReactiveHost =
  | { readonly [componentPropsType]: object }
  | { readonly [reactiveHostType]: true };
