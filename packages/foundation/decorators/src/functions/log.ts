import type { StatefulComponent } from "@praxisjs/core";

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

  return function (
    value: (this: object, ...args: unknown[]) => unknown,
    context: ClassMethodDecoratorContext<StatefulComponent>,
  ): (this: object, ...args: unknown[]) => unknown {
    const methodKey = context.name as string;

    return function (this: object, ...args: unknown[]) {
      if (
        devOnly &&
        typeof process !== "undefined" &&
        process.env.NODE_ENV === "production"
      ) {
        return value.apply(this, args);
      }

      const className =
        (this.constructor as { name?: string }).name ?? "Unknown";
      const label = `[${className}.${methodKey}]`;
      const logger = console[level].bind(console);

      if (logArgs) logger(`${label} args:`, args);

      const start = time ? performance.now() : 0;
      const output = value.apply(this, args);

      if (output instanceof Promise) {
        return (output as Promise<unknown>)
          .then((resolved) => {
            const elapsed = time
              ? ` (${(performance.now() - start).toFixed(2)}ms)`
              : "";
            if (result) logger(`${label} resolved:`, resolved, elapsed);
            return resolved;
          })
          .catch((e: unknown) => {
            logger(`${label} rejected:`, e);
            throw e;
          });
      }

      const elapsed = time
        ? ` (${(performance.now() - start).toFixed(2)}ms)`
        : "";
      if (result) logger(`${label} returned:`, output, elapsed);

      return output;
    };
  };
}
