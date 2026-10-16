import { resource } from "@praxisjs/core/internal";
import { addClaimableInitializer, assertFieldContext } from "@praxisjs/decorators";

import { registerCollection, getCollection, getPage } from "./collection";
import { ContentSchema, type CollectionConfig, type GlobImport  } from "./types";

/** Minimal interface for any composable that drives pagination (e.g. Pagination from @praxisjs/composables). */
interface PageSource {
  page: number;
  pageSize: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ResourceFieldDecorator = (_value: undefined, context: ClassFieldDecoratorContext<any>) => void;

type Host = Record<PropertyKey, unknown>;

// Each instance's resource lives under a symbol and is created with the instance; the read-only
// accessor is shared by every instance.
function resourceField(create: (instance: Host) => unknown): ResourceFieldDecorator {
  return function (_value, context) {
    assertFieldContext(context);
    const name = context.name;
    const slot = Symbol(`praxis.content.${String(name)}`);
    const descriptor: PropertyDescriptor = {
      get(this: Host): unknown {
        return this[slot];
      },
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      set(): void {},
      enumerable: true,
      configurable: true,
    };
    addClaimableInitializer(context, function () {
      const host = this as Host;
      host[slot] = create(host);
      Object.defineProperty(host, name, descriptor);
    });
  };
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
): ResourceFieldDecorator {
  return resourceField((instance) => {
    const pager = instance[pagerField] as PageSource;
    return resource(
      () => getPage(SchemaClass, { page: pager.page, pageSize: pager.pageSize }),
      { keepPreviousData: true },
    );
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function Collection(globOrSchema: GlobImport | string | (new () => ContentSchema)): any {
  if (isSchemaClass(globOrSchema)) {
    // Field decorator: @Collection(Blog) on a component field
    const SchemaClass = globOrSchema;
    return resourceField(() => resource(() => getCollection(SchemaClass)));
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
