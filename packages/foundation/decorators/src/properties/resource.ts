import {
  resource,
  type Resource as ResourceInstance,
  type ResourceOptions,
} from "@praxisjs/core/internal";

import { createFieldDecorator, type FieldBinding } from "../create-field-decorator";

export type { ResourceInstance, ResourceOptions };

type FieldDecoratorReturn = (_value: undefined, context: ClassFieldDecoratorContext) => void;

/**
 * Binds an async resource to the field.
 *
 * No component dependency — plain arrow:
 *   @Resource(() => api.getUsers())
 *   users!: ResourceInstance<User[]>;
 *
 * Reads reactive component fields — receive the instance as `self`:
 *   @Resource((self: MyComponent) => api.getPage(self.page))
 *   items!: ResourceInstance<Item[]>;
 */
export function Resource<T>(fetcher: () => Promise<T>, options?: ResourceOptions<T>): FieldDecoratorReturn;
// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unnecessary-type-parameters
export function Resource<T, C extends object = any>(fetcher: (self: C) => Promise<T>, options?: ResourceOptions<T>): FieldDecoratorReturn;
export function Resource<T>(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  fetcher: (() => Promise<T>) | ((self: any) => Promise<T>),
  options: ResourceOptions<T> = {},
): FieldDecoratorReturn {
  return createFieldDecorator({
    bind(instance, _name, _initialValue): FieldBinding {
      const bound =
        fetcher.length > 0
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ? () => (fetcher as (self: any) => Promise<T>)(instance)
          : (fetcher as () => Promise<T>);
      const r = resource(bound, options);
      return {
        descriptor: {
          get(): ResourceInstance<T> { return r; },
          // eslint-disable-next-line @typescript-eslint/no-empty-function
          set(): void {},
        },
      };
    },
  }) as unknown as FieldDecoratorReturn;
}
