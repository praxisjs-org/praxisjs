import { signal } from "@praxisjs/core/internal";

import { createFieldDecorator } from "../create-field-decorator";

import type { ReactiveHost } from "../reactive-host";

export function State() {
  return createFieldDecorator<ReactiveHost>({
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
