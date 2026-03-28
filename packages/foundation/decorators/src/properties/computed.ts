import { computed } from "@praxisjs/core/internal";

import { createGetterDecorator } from "../create-getter-decorator";

export function Computed() {
  const cache = new WeakMap<object, () => unknown>();

  return createGetterDecorator({
    wrap(original, instance) {
      let c = cache.get(instance);
      if (!c) {
        c = computed(() => original.call(instance));
        cache.set(instance, c);
      }
      return c;
    },
  });
}
