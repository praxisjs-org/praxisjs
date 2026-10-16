import { type AnyMethod, type MethodContext, sharedMethod } from "../shared-method";

export interface RetryOptions {
  delay?: number;
  backoff?: number;
  onRetry?: (error: Error, attempt: number) => void;
}

export function Retry(maxAttempts: number, options: RetryOptions = {}) {
  const { delay = 0, backoff = 1, onRetry } = options;

  return function (value: AnyMethod, context: MethodContext): AnyMethod {
    return sharedMethod(context, value, async function (this: unknown, ...args: unknown[]): Promise<unknown> {
      let lastError: Error = new Error("Unknown error");
      let currentDelay = delay;

      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          return await (value.apply(this, args) as Promise<unknown>);
        } catch (e: unknown) {
          lastError = e instanceof Error ? e : new Error(String(e));
          if (attempt === maxAttempts) break;
          onRetry?.(lastError, attempt);

          if (currentDelay > 0) {
            await new Promise((res) => setTimeout(res, currentDelay));
            currentDelay = Math.round(currentDelay * backoff);
          }
        }
      }

      throw lastError;
    });
  };
}
