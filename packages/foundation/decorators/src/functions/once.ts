import { type AnyMethod, type MethodContext, sharedMethod } from "../shared-method";

export function Once() {
  return function (value: AnyMethod, context: MethodContext): AnyMethod {
    const result = Symbol(`praxis.once.${String(context.name)}`);
    type Host = Record<symbol, unknown>;
    return sharedMethod(context, value, function (this: Host, ...args: unknown[]): unknown {
      if (result in this) return this[result];
      // Stored only once the call returns, so a call that throws can be retried.
      return (this[result] = value.apply(this, args));
    });
  };
}
