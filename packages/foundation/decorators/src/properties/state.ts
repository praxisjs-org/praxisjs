import { signal } from "@praxisjs/core/internal";

import { createFieldDecorator } from "../create-field-decorator";

export function State() {
  return createFieldDecorator({
    bind(instance, _name, initialValue) {
      const sig = signal(initialValue);
      return {
        descriptor: {
          get: () => sig(),
          set: (value: unknown) => {
            instance._stateDirty = true;
            sig.set(value);
          },
        },
      };
    },
  });
}
