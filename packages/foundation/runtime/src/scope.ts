import { effect as coreEffect } from "@praxisjs/core/internal";
import type { Cleanup } from "@praxisjs/shared/internal";

export class Scope {
  #cleanups: Cleanup[] = [];

  effect(fn: Parameters<typeof coreEffect>[0]): void {
    this.#cleanups.push(coreEffect(fn));
  }

  add(cleanup: Cleanup): void {
    this.#cleanups.push(cleanup);
  }

  fork(): Scope {
    const child = new Scope();
    this.#cleanups.push(() => { child.dispose(); });
    return child;
  }

  dispose(): void {
    const cleanups = this.#cleanups;
    this.#cleanups = [];
    const errors: unknown[] = [];
    for (const fn of cleanups) {
      try {
        fn();
      } catch (e) {
        errors.push(e);
      }
    }
    if (errors.length === 1) throw errors[0];
    if (errors.length > 1) throw new AggregateError(errors, "[PraxisJS] Multiple errors during dispose()");
  }
}
