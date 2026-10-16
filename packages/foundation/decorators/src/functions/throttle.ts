import { type AnyMethod, type MethodContext, sharedMethod } from "../shared-method";

export function Throttle(ms: number) {
  const clampedMs = Math.max(0, ms);
  return function (value: AnyMethod, context: MethodContext): AnyMethod {
    const last = Symbol(`praxis.throttle.${String(context.name)}`);
    type Host = Record<symbol, number | undefined>;
    return sharedMethod(context, value, function (this: Host, ...args: unknown[]): unknown {
      const now = Date.now();
      if (now - (this[last] ?? 0) < clampedMs) return;
      this[last] = now;
      return value.apply(this, args);
    });
  };
}
