import type { StatefulComponent } from "@praxisjs/core";
import {
  getComponentDefault,
  getComponentRawProp,
  setComponentDefault,
} from "@praxisjs/core/internal";

import { addClaimableInitializer, assertFieldContext } from "../field";

export function Prop() {
  return function <This extends StatefulComponent, Value = unknown>(
    _value: undefined,
    context: ClassFieldDecoratorContext<This, Value>,
  ): void {
    assertFieldContext(context, "@Prop()");
    const name = context.name as string;
    // Shared by every instance, like @State's accessors.
    const descriptor: PropertyDescriptor = {
      enumerable: true,
      configurable: true,
      get(this: object) {
        const fromParent = getComponentRawProp(this, name);
        if (fromParent !== undefined) {
          return typeof fromParent === "function"
            ? (fromParent as () => unknown)()
            : fromParent;
        }
        return getComponentDefault(this, name);
      },
      set(this: object, value: unknown) {
        setComponentDefault(this, name, value);
      },
    };
    addClaimableInitializer(context, function (value) {
      setComponentDefault(this, name, value);
      Object.defineProperty(this, name, descriptor);
    });
  };
}
