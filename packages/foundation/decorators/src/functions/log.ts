import { type AnyMethod, type MethodContext, sharedMethod } from "../shared-method";

export interface LogOptions {
  level?: "log" | "warn" | "error" | "debug";
  args?: boolean;
  result?: boolean;
  time?: boolean;
  devOnly?: boolean;
}

export function Log(options: LogOptions = {}) {
  const {
    level = "log",
    args: logArgs = true,
    result = true,
    time = false,
    devOnly = true,
  } = options;

  return function (value: AnyMethod, context: MethodContext): AnyMethod {
    const name = String(context.name);
    return sharedMethod(context, value, function (this: object, ...args: unknown[]): unknown {
      if (
        devOnly &&
        typeof process !== "undefined" &&
        process.env.NODE_ENV === "production"
      ) {
        return value.apply(this, args) as unknown;
      }

      const className =
        (this.constructor as { name?: string }).name ?? "Unknown";
      const label = `[${className}.${name}]`;

      if (logArgs) console[level](`${label} args:`, args);

      const start = time ? performance.now() : 0;
      const output: unknown = value.apply(this, args) as unknown;

      if (output instanceof Promise) {
        return (output as Promise<unknown>)
          .then((resolved) => {
            const elapsed = time
              ? ` (${(performance.now() - start).toFixed(2)}ms)`
              : "";
            if (result) console[level](`${label} resolved:`, resolved, elapsed);
            return resolved;
          })
          .catch((e: unknown) => {
            console[level](`${label} rejected:`, e);
            throw e;
          });
      }

      const elapsed = time
        ? ` (${(performance.now() - start).toFixed(2)}ms)`
        : "";
      if (result) console[level](`${label} returned:`, output, elapsed);

      return output;
    });
  };
}
