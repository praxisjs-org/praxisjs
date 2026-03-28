import { createMethodDecorator } from "../create-method-decorator";

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

  return createMethodDecorator({
    wrap(original, instance, name) {
      return (...args: unknown[]) => {
        if (
          devOnly &&
          typeof process !== "undefined" &&
          process.env.NODE_ENV === "production"
        ) {
          return original.apply(instance, args);
        }

        const className =
          (instance.constructor as { name?: string }).name ?? "Unknown";
        const label = `[${className}.${name}]`;
        const logger = console[level].bind(console);

        if (logArgs) logger(`${label} args:`, args);

        const start = time ? performance.now() : 0;
        const output = original.apply(instance, args);

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
    },
  });
}
