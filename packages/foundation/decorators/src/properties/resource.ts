import {
  resource,
  type Resource as ResourceInstance,
  type ResourceOptions,
} from "@praxisjs/core/internal";

import { createFieldDecorator, type FieldBinding } from "../create-field-decorator";

export type { ResourceInstance, ResourceOptions };

/**
 * Binds an async resource to the field. The field holds a Resource<T> object
 * with reactive data, pending, error, and status signals, plus refetch/cancel/mutate methods.
 *
 * class MyComponent extends StatefulComponent {
 *   @Resource(() => api.getUsers())
 *   users!: ResourceInstance<User[]>;
 *   // access: this.users.data(), this.users.pending(), this.users.refetch()
 * }
 */
export function Resource<T>(fetcher: () => Promise<T>, options: ResourceOptions<T> = {}) {
  return createFieldDecorator({
    bind(_instance, _name, _initialValue): FieldBinding {
      const r = resource(fetcher, options);
      return {
        descriptor: {
          get(): ResourceInstance<T> { return r; },
          // eslint-disable-next-line @typescript-eslint/no-empty-function
          set(): void {},
        },
      };
    },
  });
}
