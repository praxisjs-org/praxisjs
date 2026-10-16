import {
  resource,
  type Resource as ResourceInstance,
  type ResourceOptions,
} from "@praxisjs/core/internal";

import { type FieldHost, sharedField } from "../field";
import { addLifecycleHooks } from "../lifecycle";

export { invalidateResource } from "@praxisjs/core/internal";
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
  return sharedField((name) => {
    const slot = Symbol(`praxis.resource.${name}`);
    const destroy = (instance: object) => { ((instance as FieldHost)[slot] as ResourceInstance<T>).destroy(); };
    return {
      descriptor: {
        get(this: FieldHost): ResourceInstance<T> {
          return this[slot] as ResourceInstance<T>;
        },
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        set(): void {},
      },
      init(instance) {
        const bound =
          fetcher.length > 0
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ? () => (fetcher as (self: any) => Promise<T>)(instance)
            : (fetcher as () => Promise<T>);
        instance[slot] = resource(bound, options);
        addLifecycleHooks(instance, undefined, destroy);
      },
    };
  }) as unknown as FieldDecoratorReturn;
}
