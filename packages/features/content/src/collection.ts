import { parseFrontmatter, defaultRender } from "./parse-md";
import { applySchema } from "./schema";

import type {
  ContentSchema,
  CollectionConfig,
  Entry,
  GlobImport,
  PageOptions,
} from "./types";

const _registry = new WeakMap<typeof ContentSchema, CollectionConfig>();

export function registerCollection(
  SchemaClass: typeof ContentSchema,
  config: CollectionConfig,
): void {
  _registry.set(SchemaClass, config);
}

export async function getCollection<S extends ContentSchema>(
  SchemaClass: new () => S,
): Promise<Array<Entry<S>>> {
  const config = _registry.get(SchemaClass as unknown as typeof ContentSchema);
  if (!config) {
    throw new Error(
      `[content] ${SchemaClass.name} is not registered. Did you forget @Collection('./path/*.md')?`,
    );
  }

  const { glob, render = defaultRender } = config;

  const settled = await Promise.all(
    Object.entries(glob).map(async ([path, loader]) => {
      const raw = await loadRaw(loader as GlobImport[string]);
      const slug = pathToSlug(path);
      const { data, body } = parseFrontmatter(raw);
      const validated = applySchema(SchemaClass, data, slug);
      return { slug, data: validated, body, html: render(body) } as Entry<S>;
    }),
  );

  return settled.sort((a, b) => a.slug.localeCompare(b.slug));
}

export function getTotal(SchemaClass: new () => ContentSchema): number {
  const config = _registry.get(SchemaClass as unknown as typeof ContentSchema);
  if (!config) {
    throw new Error(
      `[content] ${SchemaClass.name} is not registered. Did you forget @Collection('./path/*.md')?`,
    );
  }
  return Object.keys(config.glob).length;
}

export async function getPage<S extends ContentSchema>(
  SchemaClass: new () => S,
  options: PageOptions,
): Promise<Array<Entry<S>>> {
  const config = _registry.get(SchemaClass as unknown as typeof ContentSchema);
  if (!config) {
    throw new Error(
      `[content] ${SchemaClass.name} is not registered. Did you forget @Collection('./path/*.md')?`,
    );
  }

  const { glob, render = defaultRender } = config;
  const { page, pageSize } = options;

  const sortedKeys = Object.keys(glob).sort();
  const start = (page - 1) * pageSize;
  const slice = sortedKeys.slice(start, start + pageSize);

  return Promise.all(
    slice.map(async (path) => {
      const raw = await loadRaw(glob[path]);
      const slug = pathToSlug(path);
      const { data, body } = parseFrontmatter(raw);
      const validated = applySchema(SchemaClass, data, slug);
      return { slug, data: validated, body, html: render(body) } as Entry<S>;
    }),
  );
}

export async function getEntry<S extends ContentSchema>(
  SchemaClass: new () => S,
  slug: string,
): Promise<Entry<S> | null> {
  const config = _registry.get(SchemaClass as unknown as typeof ContentSchema);
  if (!config) {
    throw new Error(
      `[content] ${SchemaClass.name} is not registered. Did you forget @Collection('./path/*.md')?`,
    );
  }

  const { glob, render = defaultRender } = config;
  const match = Object.entries(glob).find(([path]) => pathToSlug(path) === slug);
  if (!match) return null;

  const [, loader] = match as [string, GlobImport[string]];
  const raw = await loadRaw(loader);
  const { data, body } = parseFrontmatter(raw);
  const validated = applySchema(SchemaClass, data, slug);
  return { slug, data: validated, body, html: render(body) };
}

export function pathToSlug(path: string): string {
  return path
    .replace(/^.*[\\/]/, "")
    .replace(/\.mdx?$/, "");
}

async function loadRaw(loader: GlobImport[string]): Promise<string> {
  if (typeof loader === "string") return loader;
  return loader();
}
