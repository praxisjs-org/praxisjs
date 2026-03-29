import { createFieldDecorator } from "@praxisjs/decorators";
import type { Computed } from "@praxisjs/shared";

import { pool } from "./pool";
import { queue } from "./queue";
import { task } from "./task";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyAsyncFn = (this: any, ...args: any[]) => Promise<any>;

// ── Decorated types ────────────────────────────────────────────────────────────

export type TaskDecorated<T extends AnyAsyncFn> =
  ((...args: Parameters<T>) => ReturnType<T>) & {
    loading: Computed<boolean>;
    error: Computed<Error | null>;
    lastResult: Computed<Awaited<ReturnType<T>> | null>;
    cancelAll(): void;
  };

export type QueueDecorated<T extends AnyAsyncFn> =
  ((...args: Parameters<T>) => ReturnType<T>) & {
    loading: Computed<boolean>;
    pending: Computed<number>;
    error: Computed<Error | null>;
    clear(): void;
  };

export type PoolDecorated<T extends AnyAsyncFn> =
  ((...args: Parameters<T>) => ReturnType<T>) & {
    loading: Computed<boolean>;
    active: Computed<number>;
    pending: Computed<number>;
    error: Computed<Error | null>;
  };

// ── Type helpers ───────────────────────────────────────────────────────────────

export type TaskOf<C, K extends keyof C> =
  C[K] extends AnyAsyncFn ? TaskDecorated<C[K]> : never;

export type QueueOf<C, K extends keyof C> =
  C[K] extends AnyAsyncFn ? QueueDecorated<C[K]> : never;

export type PoolOf<C, K extends keyof C> =
  C[K] extends AnyAsyncFn ? PoolDecorated<C[K]> : never;

// ── @Task ──────────────────────────────────────────────────────────────────────

export function Task(methodName: string) {
  return createFieldDecorator({
    bind(instance: object, _name: string) {
      const inst = instance as Record<string, AnyAsyncFn>;
      return {
        descriptor: {
          value: task(inst[methodName].bind(instance)) as unknown,
          writable: true,
        },
      };
    },
  });
}

// ── @Queue ─────────────────────────────────────────────────────────────────────

export function Queue(methodName: string) {
  return createFieldDecorator({
    bind(instance: object, _name: string) {
      const inst = instance as Record<string, AnyAsyncFn>;
      return {
        descriptor: {
          value: queue(inst[methodName].bind(instance)) as unknown,
          writable: true,
        },
      };
    },
  });
}

// ── @Pool ──────────────────────────────────────────────────────────────────────

export function Pool(methodName: string, concurrency = 1) {
  return createFieldDecorator({
    bind(instance: object, _name: string) {
      const inst = instance as Record<string, AnyAsyncFn>;
      return {
        descriptor: {
          value: pool(concurrency, inst[methodName].bind(instance)) as unknown,
          writable: true,
        },
      };
    },
  });
}
