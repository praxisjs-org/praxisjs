import { computed } from "@praxisjs/core/internal";
import type { Computed } from "@praxisjs/shared";

import { createMethodDecorator } from "../create-method-decorator";

const objectIdMap = new WeakMap<object, number>();
let objectIdCounter = 0;

function objectIdentityKey(obj: object): string {
  if (!objectIdMap.has(obj)) {
    objectIdMap.set(obj, ++objectIdCounter);
  }
  return `__obj_${String(objectIdMap.get(obj))}__`;
}

function serializeArgs(args: unknown[]) {
  if (args.length === 0) return "__no_args__";
  return args
    .map((a) => {
      if (a === null || typeof a === "object") {
        try {
          return JSON.stringify(a);
        } catch {
          return a === null ? "null" : objectIdentityKey(a);
        }
      }
      if (typeof a === "symbol") return a.toString();
      return String(a as string | number | boolean | bigint | undefined);
    })
    .join("|");
}

export function Memo() {
  return createMethodDecorator({
    wrap(original, instance, _name) {
      const cache = new Map<string, Computed<unknown>>();
      return (...args: unknown[]) => {
        const key = serializeArgs(args);
        let memoized = cache.get(key);
        if (!memoized) {
          memoized = computed(() => original.apply(instance, args));
          cache.set(key, memoized);
        }
        return memoized();
      };
    },
  });
}
