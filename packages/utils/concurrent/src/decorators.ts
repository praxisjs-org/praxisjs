import { pool } from "./pool";
import { queue } from "./queue";
import { task } from "./task";

export function Task() {
  return function (
    _target: object,
    methodKey: string,
    descriptor: PropertyDescriptor,
  ): PropertyDescriptor {
    const original = descriptor.value as (
      ...args: unknown[]
    ) => Promise<unknown>;
    const cacheKey = `__task_${methodKey}`;
    return {
      configurable: true,
      enumerable: false,
      get(this: Record<string, unknown>) {
        if (!this[cacheKey]) {
          const t = task(original.bind(this));
          this[cacheKey] = t;
          this[`${methodKey}_loading`] = t.loading;
          this[`${methodKey}_error`] = t.error;
          this[`${methodKey}_lastResult`] = t.lastResult;
        }
        const t = this[cacheKey] as (...args: unknown[]) => Promise<unknown>;
        const bound = (...args: unknown[]) => t(...args);
        Object.defineProperty(this, methodKey, {
          value: bound,
          configurable: true,
          writable: true,
        });
        return bound;
      },
    };
  };
}

export function Queue() {
  return function (
    _target: object,
    methodKey: string,
    descriptor: PropertyDescriptor,
  ): PropertyDescriptor {
    const original = descriptor.value as (
      ...args: unknown[]
    ) => Promise<unknown>;
    const cacheKey = `__queue_${methodKey}`;
    return {
      configurable: true,
      enumerable: false,
      get(this: Record<string, unknown>) {
        if (!this[cacheKey]) {
          const q = queue(original.bind(this));
          this[cacheKey] = q;
          this[`${methodKey}_loading`] = q.loading;
          this[`${methodKey}_pending`] = q.pending;
          this[`${methodKey}_error`] = q.error;
        }
        const q = this[cacheKey] as (...args: unknown[]) => Promise<unknown>;
        const bound = (...args: unknown[]) => q(...args);
        Object.defineProperty(this, methodKey, {
          value: bound,
          configurable: true,
          writable: true,
        });
        return bound;
      },
    };
  };
}

export function Pool(concurrency: number) {
  return function (
    _target: object,
    methodKey: string,
    descriptor: PropertyDescriptor,
  ): PropertyDescriptor {
    const original = descriptor.value as (
      ...args: unknown[]
    ) => Promise<unknown>;
    const cacheKey = `__pool_${methodKey}`;
    return {
      configurable: true,
      enumerable: false,
      get(this: Record<string, unknown>) {
        if (!this[cacheKey]) {
          const p = pool(concurrency, original.bind(this));
          this[cacheKey] = p;
          this[`${methodKey}_loading`] = p.loading;
          this[`${methodKey}_active`] = p.active;
          this[`${methodKey}_pending`] = p.pending;
          this[`${methodKey}_error`] = p.error;
        }
        const p = this[cacheKey] as (...args: unknown[]) => Promise<unknown>;
        const bound = (...args: unknown[]) => p(...args);
        Object.defineProperty(this, methodKey, {
          value: bound,
          configurable: true,
          writable: true,
        });
        return bound;
      },
    };
  };
}
