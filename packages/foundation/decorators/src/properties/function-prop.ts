import {
  getComponentDefault,
  getComponentRawProp,
  setComponentDefault,
} from "@praxisjs/core/internal";

import { type FieldDecorator, type FieldHost, sharedField } from "../field";

export function FunctionProp(): FieldDecorator {
  return sharedField((name) => ({
    descriptor: {
      get(this: FieldHost) {
        const fromParent = getComponentRawProp(this, name);
        if (fromParent !== undefined) {
          if (
            process.env.NODE_ENV !== "production" &&
            typeof fromParent !== "function"
          ) {
            console.warn(
              `[FunctionProp] "${name}" received a non-function value (${typeof fromParent}). @FunctionProp() expects a function.`,
            );
          }
          return fromParent;
        }
        return getComponentDefault(this, name);
      },
      set(this: FieldHost, value: unknown) {
        setComponentDefault(this, name, value);
      },
    },
    init(instance, initialValue) {
      setComponentDefault(instance, name, initialValue);
    },
  }));
}
