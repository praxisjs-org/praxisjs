import { parseFrontmatter, defaultRender } from "./parse-md";
import { applySchema } from "./schema";

import type {
  ContentSchema,
  CollectionConfig,
  Entry,
  GlobImport,
  PageOptions,
} from "./types";

type SchemaClassOf<S extends ContentSchema> = new () => S;

// Parsing and rendering an entry is the expensive part, and a collection's files don't change while
// the page lives (an edited file triggers a full reload that resets this module), so each entry is
// loaded once and shared by getCollection, getPage and getEntry. Registering a collection again
// replaces its state, so it starts clean.
interface CollectionState {
  config: CollectionConfig;
  entries: Map<string, Promise<Entry<ContentSchema>>>;
  all: Promise<Array<Entry<ContentSchema>>> | undefined;
  sortedPaths: string[] | undefined;
  slugToPath: Map<string, string> | undefined;
}

const _registry = new WeakMap<typeof ContentSchema, CollectionState>();

export function registerCollection(
  SchemaClass: typeof ContentSchema,
  config: CollectionConfig,
): void {
  _registry.set(SchemaClass, {
    config,
    entries: new Map(),
    all: undefined,
    sortedPaths: undefined,
    slugToPath: undefined,
  });
}

function stateOf(SchemaClass: SchemaClassOf<ContentSchema>): CollectionState {
  const state = _registry.get(SchemaClass as unknown as typeof ContentSchema);
  if (!state) {
    throw new Error(
      `[content] ${SchemaClass.name} is not registered. Did you forget @Collection('./path/*.md')?`,
    );
  }
  return state;
}

// A failed load is not remembered, or one transient import error would stick.
function remember<T>(promise: Promise<T>, forget: () => void): Promise<T> {
  promise.catch(forget);
  return promise;
}

function loadEntry<S extends ContentSchema>(
  SchemaClass: SchemaClassOf<S>,
  state: CollectionState,
  path: string,
): Promise<Entry<S>> {
  let pending = state.entries.get(path);
  if (!pending) {
    const { glob, render = defaultRender } = state.config;
    pending = remember(
      loadRaw(glob[path]).then((raw) => {
        const slug = pathToSlug(path);
        const { data, body } = parseFrontmatter(raw);
        const validated = applySchema(SchemaClass, data, slug);
        return { slug, data: validated, body, html: render(body) };
      }),
      () => { state.entries.delete(path); },
    );
    state.entries.set(path, pending);
  }
  return pending as Promise<Entry<S>>;
}

export async function getCollection<S extends ContentSchema>(
  SchemaClass: SchemaClassOf<S>,
): Promise<Array<Entry<S>>> {
  const state = stateOf(SchemaClass);
  state.all ??= remember(
    Promise.all(
      Object.keys(state.config.glob).map((path) => loadEntry(SchemaClass, state, path)),
    ).then((entries) => entries.sort((a, b) => a.slug.localeCompare(b.slug))),
    () => { state.all = undefined; },
  );

  // Copy so a caller sorting or mutating the array doesn't affect the next caller.
  return [...((await state.all) as Array<Entry<S>>)];
}

export function getTotal(SchemaClass: SchemaClassOf<ContentSchema>): number {
  return Object.keys(stateOf(SchemaClass).config.glob).length;
}

export async function getPage<S extends ContentSchema>(
  SchemaClass: SchemaClassOf<S>,
  options: PageOptions,
): Promise<Array<Entry<S>>> {
  const state = stateOf(SchemaClass);
  const { page, pageSize } = options;

  state.sortedPaths ??= Object.keys(state.config.glob).sort();
  const start = (page - 1) * pageSize;
  const slice = state.sortedPaths.slice(start, start + pageSize);

  return Promise.all(slice.map((path) => loadEntry(SchemaClass, state, path)));
}

export async function getEntry<S extends ContentSchema>(
  SchemaClass: SchemaClassOf<S>,
  slug: string,
): Promise<Entry<S> | null> {
  const state = stateOf(SchemaClass);

  if (!state.slugToPath) {
    state.slugToPath = new Map();
    for (const path of Object.keys(state.config.glob)) {
      const key = pathToSlug(path);
      // The first file wins when two share a slug, as a front-to-back search would pick it.
      if (!state.slugToPath.has(key)) state.slugToPath.set(key, path);
    }
  }
  const path = state.slugToPath.get(slug);
  if (path === undefined) return null;
  return loadEntry(SchemaClass, state, path);
}

export function pathToSlug(path: string): string {
  return path
    .replace(/^.*[\\/]/, "")
    .replace(/\.mdx?$/, "");
}

const DYNAMIC_SEGMENT = /:[^/]+/g;

/**
 * Builds a `@praxisjs/ssg`-compatible per-route `getStaticPaths` from a
 * collection: every entry's `slug` is substituted into the route's one
 * dynamic segment. Every `@Collection` entry has a `slug`, so this needs
 * nothing beyond the schema class itself — no manual mapping/glue code.
 *
 * `fullPath` must contain exactly one dynamic segment (e.g. `/blog/:slug`);
 * routes with more than one param aren't a single-field substitution and
 * need a hand-written `getStaticPaths` instead.
 */
export function collectionStaticPaths(
  SchemaClass: new () => ContentSchema,
): (fullPath: string) => Promise<string[]> {
  return async (fullPath: string) => {
    const segments = fullPath.match(DYNAMIC_SEGMENT) ?? [];
    if (segments.length !== 1) {
      throw new Error(
        `[content] collectionStaticPaths(${SchemaClass.name}) expects exactly one dynamic segment in the route path, got "${fullPath}" (${String(segments.length)} found). Write a custom getStaticPaths for routes with zero or multiple params.`,
      );
    }
    const entries = await getCollection(SchemaClass);
    return entries.map((entry) => fullPath.replace(DYNAMIC_SEGMENT, entry.slug));
  };
}

async function loadRaw(loader: GlobImport[string]): Promise<string> {
  if (typeof loader === "string") return loader;
  return loader();
}
