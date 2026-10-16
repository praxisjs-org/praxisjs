import { computed } from "@praxisjs/core/internal";
import type { Computed } from "@praxisjs/shared";

import { type AnyMethod, type MethodContext, sharedMethod } from "../shared-method";

const objectIdMap = new WeakMap<object, number>();
let objectIdCounter = 0;

function objectIdentityKey(obj: object): string {
  if (!objectIdMap.has(obj)) {
    objectIdMap.set(obj, ++objectIdCounter);
  }
  return `__obj_${String(objectIdMap.get(obj))}__`;
}

function serializeArg(a: unknown): string {
  if (a === null || typeof a === "object") {
    try {
      return JSON.stringify(a);
    } catch {
      return objectIdentityKey(a as object);
    }
  }
  if (typeof a === "symbol") return a.toString();
  return String(a as string | number | boolean | bigint | undefined);
}

function serializeArgs(args: unknown[]) {
  if (args.length === 0) return "__no_args__";
  // The common single-argument call skips the intermediate array and join.
  if (args.length === 1) return serializeArg(args[0]);
  return args.map(serializeArg).join("|");
}

export interface MemoOptions {
  /**
   * Maximum number of cached argument combinations. When exceeded, the least recently used entry
   * is dropped. Defaults to 100; pass `Infinity` to keep every combination.
   */
  max?: number;
}

const DEFAULT_MAX = 100;

type Disposable = Computed<unknown> & { dispose(): void };

export function Memo(options: MemoOptions = {}) {
  const { max = DEFAULT_MAX } = options;

  return function (value: AnyMethod, context: MethodContext): AnyMethod {
    const caches = Symbol(`praxis.memo.${String(context.name)}`);
    type Host = Record<symbol, Map<string, Computed<unknown>> | undefined>;
    return sharedMethod(context, value, function (this: Host, ...args: unknown[]): unknown {
      const cache = (this[caches] ??= new Map<string, Computed<unknown>>());
      const key = serializeArgs(args);
      let memoized = cache.get(key);
      if (memoized) {
        // Re-insert so Map order tracks recency.
        cache.delete(key);
        cache.set(key, memoized);
      } else {
        memoized = computed(() => value.apply(this, args) as unknown);
        cache.set(key, memoized);
        if (cache.size > max) {
          const [oldestKey, oldest] = cache.entries().next().value as [string, Computed<unknown>];
          cache.delete(oldestKey);
          // Releases the entry's hold on the signals it read; a no-op if a binding still uses it.
          (oldest as Disposable).dispose();
        }
      }
      return memoized();
    });
  };
}
