import { resource } from "@praxisjs/core/internal";
import {
  createFieldDecorator,
  type FieldBinding,
} from "@praxisjs/decorators";

import { registerCollection, getCollection, getPage } from "./collection";
import { ContentSchema, type CollectionConfig, type GlobImport  } from "./types";

/** Minimal interface for any composable that drives pagination (e.g. Pagination from @praxisjs/composables). */
interface PageSource {
  page: number;
  pageSize: number;
}

/**
 * Field decorator that creates a paginated reactive resource backed by `getPage`.
 * The page state is read from a `PageSource` composable already set up on the instance.
 *
 * @param SchemaClass - The ContentSchema subclass decorated with @Collection.
 * @param pagerField  - Name of the field on the component that holds the PageSource composable.
 *
 * @example
 * @Compose(Pagination, { total: getTotal(Blog), pageSize: 10 })
 * pager!: Pagination;
 *
 * @PagedCollection(Blog, 'pager')
 * posts!: Resource<Entry<Blog>[]>;
 */
export function PagedCollection(
  SchemaClass: new () => ContentSchema,
  pagerField: string,
) {
  return createFieldDecorator({
    bind(instance, _name, _initialValue): FieldBinding {
      const pager = (instance as unknown as Record<string, PageSource>)[pagerField];
      const res = resource(
        () => getPage(SchemaClass, { page: pager.page, pageSize: pager.pageSize }),
        { keepPreviousData: true },
      );
      return {
        descriptor: {
          get() { return res; },
          // eslint-disable-next-line @typescript-eslint/no-empty-function
          set(): void {},
        },
      };
    },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  }) as unknown as (_value: undefined, context: ClassFieldDecoratorContext<any>) => void;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function Collection(globOrSchema: GlobImport | string | (new () => ContentSchema)): any {
  if (isSchemaClass(globOrSchema)) {
    // Field decorator: @Collection(Blog) on a component field
    const SchemaClass = globOrSchema;
    return createFieldDecorator({
      bind(_instance, _name, _initialValue): FieldBinding {
        const res = resource(() => getCollection(SchemaClass));
        return {
          descriptor: {
            get() { return res; },
            // eslint-disable-next-line @typescript-eslint/no-empty-function
            set(): void {},
          },
        };
      },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }) as unknown as (_value: undefined, context: ClassFieldDecoratorContext<any>) => void;
  }

  // Class decorator: @Collection(globResult) — after Vite plugin transforms the string
  const config: CollectionConfig = { glob: globOrSchema as GlobImport };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return function (SchemaClass: new () => ContentSchema, _ctx: ClassDecoratorContext): any {
    registerCollection(SchemaClass as unknown as typeof ContentSchema, config);
    return SchemaClass;
  };
}

function isSchemaClass(v: unknown): v is new () => ContentSchema {
  return (
    typeof v === "function" &&
    (v as { prototype: unknown }).prototype instanceof ContentSchema
  );
}
