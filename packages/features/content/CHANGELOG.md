# @praxisjs/content

## 0.2.0

### Minor Changes

- a4963a0: Add `collectionStaticPaths(Schema)` — builds a `@praxisjs/ssg`-compatible per-route `getStaticPaths` directly from a collection, substituting each entry's `slug` into the route's one dynamic segment. Removes the need to hand-write a `getCollection(...).map(...)` for the common case of a dynamic route backed 1:1 by a content collection.

### Patch Changes

- Updated dependencies [1ec5b2f]
  - @praxisjs/core@2.1.0
  - @praxisjs/decorators@1.6.1

## 0.1.11

### Patch Changes

- Updated dependencies [b24f603]
  - @praxisjs/decorators@1.6.0

## 0.1.10

### Patch Changes

- 9c2a7e0: `peerDependencies.vite` raised from `>=7.0.0` to `>=8.0.0`, matching the Vite 8 requirement the rest of the ecosystem (`@praxisjs/vite-plugin`) already enforces. `contentPlugin()` itself has no Vite-version-specific behavior — this only corrects the declared range so package managers warn projects still on Vite 7 instead of letting them install a combination that doesn't actually work once decorators are involved.

## 0.1.9

### Patch Changes

- Updated dependencies [f1b7ee7]
  - @praxisjs/decorators@1.5.1

## 0.1.8

### Patch Changes

- Updated dependencies [55e645d]
- Updated dependencies [8ab6426]
  - @praxisjs/decorators@1.5.0
  - @praxisjs/core@2.0.0

## 0.1.7

### Patch Changes

- Updated dependencies [7d87288]
  - @praxisjs/core@1.8.3
  - @praxisjs/decorators@1.4.1

## 0.1.6

### Patch Changes

- Updated dependencies [bcaad96]
- Updated dependencies [376e38c]
  - @praxisjs/decorators@1.4.0
  - @praxisjs/core@1.8.2

## 0.1.5

### Patch Changes

- Updated dependencies [dc031d0]
  - @praxisjs/core@1.8.1
  - @praxisjs/decorators@1.3.1

## 0.1.4

### Patch Changes

- Updated dependencies [80442e0]
  - @praxisjs/decorators@1.3.0
  - @praxisjs/core@1.8.0

## 0.1.3

### Patch Changes

- Updated dependencies [3fb2309]
  - @praxisjs/decorators@1.2.0

## 0.1.2

### Patch Changes

- Updated dependencies [a0372af]
  - @praxisjs/decorators@1.1.1

## 0.1.1

### Patch Changes

- Updated dependencies [378cc54]
  - @praxisjs/core@1.7.0
  - @praxisjs/decorators@1.1.0

## 0.1.0

### Minor Changes

- 8ffce8b: Initial release of `@praxisjs/content` — markdown content collections inspired by Astro Collections.

  Define a schema class extending `ContentSchema`, use `@Collection('./path/*.md')` to register it (the bundled Vite plugin expands the string glob at build time), and inject entries reactively with `@Collection(SchemaClass)` on component fields. Runtime frontmatter validation via default values, zero-dependency YAML parser, `marked` for HTML rendering.

  Includes pagination support out of the box:
  - `getTotal(SchemaClass)` — synchronous count of entries (no file I/O)
  - `getPage(SchemaClass, { page, pageSize })` — loads only the requested slice, files fetched in parallel
  - `@PagedCollection(SchemaClass, pagerField)` — field decorator that wires to any composable with `page` + `pageSize` (e.g. `Pagination`); re-fetches automatically when the page changes
  - `getEntry` loads only the single file matching the slug
  - Glob loading is lazy by default — each `.md` file becomes its own chunk

### Patch Changes

- Updated dependencies [cfb0de2]
  - @praxisjs/decorators@1.0.2
