import { addLifecycleHooks } from "../lifecycle";
import { type AnyMethod, type MethodContext, sharedMethod } from "../shared-method";

type Timer = ReturnType<typeof setTimeout>;

export function Debounce(ms: number) {
  return function (value: AnyMethod, context: MethodContext): AnyMethod {
    // undefined: never called. null: called, nothing pending.
    const timer = Symbol(`praxis.debounce.${String(context.name)}`);
    type Host = Record<symbol, Timer | null | undefined>;

    function cancel(instance: object): void {
      const pending = (instance as Host)[timer];
      if (pending != null) {
        clearTimeout(pending);
        (instance as Host)[timer] = null;
      }
    }

    return sharedMethod(context, value, function (this: Host, ...args: unknown[]): void {
      const pending = this[timer];
      // Only an instance that has called the method can have a timer to cancel on unmount.
      if (pending === undefined) addLifecycleHooks(this, undefined, cancel);
      else if (pending !== null) clearTimeout(pending);
      this[timer] = setTimeout(() => {
        this[timer] = null;
        value.apply(this, args);
      }, ms);
    });
  };
}
