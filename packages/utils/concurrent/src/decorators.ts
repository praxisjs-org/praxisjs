import { createFieldDecorator } from "@praxisjs/decorators";
import type { Computed } from "@praxisjs/shared";

import { pool } from "./pool";
import { queue } from "./queue";
import { task } from "./task";
import { acceptsSignal } from "./utils";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyAsyncFn = (this: any, ...args: any[]) => Promise<any>;

/**
 * Strips the leading AbortSignal from a parameter tuple when present,
 * so decorated fields expose only the user-visible arguments.
 *
 * Examples:
 *   [AbortSignal, number, string] → [number, string]
 *   [number, string]              → [number, string]  (unchanged)
 */
type DropSignalIfPresent<T extends unknown[]> =
  T extends [AbortSignal, ...infer R] ? R : T;

// ── Decorated types ────────────────────────────────────────────────────────────

export type TaskDecorated<T extends AnyAsyncFn> =
  ((...args: DropSignalIfPresent<Parameters<T>>) => ReturnType<T>) & {
    loading: Computed<boolean>;
    error: Computed<Error | null>;
    lastResult: Computed<Awaited<ReturnType<T>> | null>;
    cancelAll(): void;
  };

export type QueueDecorated<T extends AnyAsyncFn> =
  ((...args: DropSignalIfPresent<Parameters<T>>) => ReturnType<T>) & {
    loading: Computed<boolean>;
    pending: Computed<number>;
    error: Computed<Error | null>;
    clear(): void;
  };

export type PoolDecorated<T extends AnyAsyncFn> =
  ((...args: DropSignalIfPresent<Parameters<T>>) => ReturnType<T>) & {
    loading: Computed<boolean>;
    active: Computed<number>;
    pending: Computed<number>;
    error: Computed<Error | null>;
    cancelAll(): void;
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
      // Detect signal on the unbound method — bound functions lose their source.
      const wantsSignal = acceptsSignal(inst[methodName]);
      return {
        descriptor: {
          value: task(inst[methodName].bind(instance), { signal: wantsSignal }) as unknown,
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
      const wantsSignal = acceptsSignal(inst[methodName]);
      return {
        descriptor: {
          value: queue(inst[methodName].bind(instance), { signal: wantsSignal }) as unknown,
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
      const wantsSignal = acceptsSignal(inst[methodName]);
      return {
        descriptor: {
          value: pool(concurrency, inst[methodName].bind(instance), { signal: wantsSignal }) as unknown,
          writable: true,
        },
      };
    },
  });
}
