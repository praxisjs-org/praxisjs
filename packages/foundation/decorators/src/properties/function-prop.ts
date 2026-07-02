import {
  getComponentDefault,
  getComponentRawProp,
  setComponentDefault,
} from "@praxisjs/core/internal";

import { createFieldDecorator } from "../create-field-decorator";

export function FunctionProp() {
  return createFieldDecorator({
    bind(instance, name, initialValue) {
      setComponentDefault(instance, name, initialValue);
      return {
        descriptor: {
          get() {
            const fromParent = getComponentRawProp(instance, name);
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
            return getComponentDefault(instance, name);
          },
          set(value: unknown) {
            setComponentDefault(instance, name, value);
          },
        },
      };
    },
  });
}
