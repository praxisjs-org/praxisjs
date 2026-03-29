import { createMethodDecorator } from "@praxisjs/decorators";

import { pool } from "./pool";
import { queue } from "./queue";
import { task } from "./task";

export function Task() {
  return createMethodDecorator({
    wrap(original, instance, name) {
      const self = instance as Record<string, unknown>;
      const t = task((original as (...args: unknown[]) => Promise<unknown>).bind(instance));
      self[`${name}_loading`] = t.loading;
      self[`${name}_error`] = t.error;
      self[`${name}_lastResult`] = t.lastResult;
      return (...args: unknown[]) => t(...args);
    },
  // Concurrent decorators work on any class, not just StatefulComponent
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  }) as unknown as (value: (...args: any[]) => Promise<any>, context: ClassMethodDecoratorContext<any>) => void;
}

export function Queue() {
  return createMethodDecorator({
    wrap(original, instance, name) {
      const self = instance as Record<string, unknown>;
      const q = queue((original as (...args: unknown[]) => Promise<unknown>).bind(instance));
      self[`${name}_loading`] = q.loading;
      self[`${name}_pending`] = q.pending;
      self[`${name}_error`] = q.error;
      self[`${name}_clear`] = () => { q.clear(); };
      return (...args: unknown[]) => q(...args);
    },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  }) as unknown as (value: (...args: any[]) => Promise<any>, context: ClassMethodDecoratorContext<any>) => void;
}

export function Pool(concurrency: number) {
  return createMethodDecorator({
    wrap(original, instance, name) {
      const self = instance as Record<string, unknown>;
      const p = pool(concurrency, (original as (...args: unknown[]) => Promise<unknown>).bind(instance));
      self[`${name}_loading`] = p.loading;
      self[`${name}_active`] = p.active;
      self[`${name}_pending`] = p.pending;
      self[`${name}_error`] = p.error;
      return (...args: unknown[]) => p(...args);
    },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  }) as unknown as (value: (...args: any[]) => Promise<any>, context: ClassMethodDecoratorContext<any>) => void;
}
