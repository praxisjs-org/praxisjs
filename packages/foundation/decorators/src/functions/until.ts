import { computed, until } from "@praxisjs/core/internal";
import type { Computed, Signal } from "@praxisjs/shared";
import { isReactive } from "@praxisjs/shared/internal";

import { type AnyMethod, type MethodContext, sharedMethod } from "../shared-method";

export function Until(propName: string) {
  return function (value: AnyMethod, context: MethodContext): AnyMethod {
    return sharedMethod(context, value, function (this: Record<string, unknown>) {
      const raw = this[propName];
      // A @State/@Prop field reads as its plain value; reading it inside a computed tracks its signal.
      const source =
        isReactive(raw)
          ? (raw as Signal<unknown> | Computed<unknown>)
          : computed(() => this[propName]);
      return until(source);
    });
  };
}
