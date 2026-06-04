# @praxisjs/content

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
