import type { StatefulComponent } from "@praxisjs/core";
import { computed } from "@praxisjs/core/internal";
import type { Computed } from "@praxisjs/shared";

const instanceCache = new WeakMap<
  object,
  Map<string, Map<string, Computed<unknown>>>
>();

function getCache(
  instance: object,
  methodName: string,
  argKey: string,
  factory: () => unknown,
): Computed<unknown> {
  let methodMap = instanceCache.get(instance);
  if (!methodMap) {
    methodMap = new Map();
    instanceCache.set(instance, methodMap);
  }

  let argMap = methodMap.get(methodName);
  if (!argMap) {
    argMap = new Map();
    methodMap.set(methodName, argMap);
  }

  let cached = argMap.get(argKey);
  if (!cached) {
    cached = computed(factory);
    argMap.set(argKey, cached);
  }

  return cached;
}

function serializeArgs(args: unknown[]) {
  if (args.length === 0) return "__no_args__";
  return args
    .map((a) => {
      if (a === null || typeof a === "object") return JSON.stringify(a);
      if (typeof a === "symbol") return a.toString();
      return String(a as string | number | boolean | bigint | undefined);
    })
    .join("|");
}

export function Memo() {
  return function (
    value: (this: object, ...args: unknown[]) => unknown,
    context: ClassMethodDecoratorContext<StatefulComponent>,
  ): (this: object, ...args: unknown[]) => unknown {
    const methodName = context.name as string;
    return function (this: object, ...args: unknown[]) {
      const argKey = serializeArgs(args);
      const memoized = getCache(this, methodName, argKey, () =>
        value.apply(this, args),
      );
      return memoized();
    };
  };
}
