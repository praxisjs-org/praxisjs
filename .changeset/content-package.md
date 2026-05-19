---
"@praxisjs/content": minor
---

Initial release of `@praxisjs/content` — markdown content collections inspired by Astro Collections.

Define a schema class extending `ContentSchema`, use `@Collection('./path/*.md')` to register it (the bundled Vite plugin expands the string glob at build time), and inject entries reactively with `@Collection(SchemaClass)` on component fields. Runtime frontmatter validation via default values, zero-dependency YAML parser, `marked` for HTML rendering.

Includes pagination support out of the box:

- `getTotal(SchemaClass)` — synchronous count of entries (no file I/O)
- `getPage(SchemaClass, { page, pageSize })` — loads only the requested slice, files fetched in parallel
- `@PagedCollection(SchemaClass, pagerField)` — field decorator that wires to any composable with `page` + `pageSize` (e.g. `Pagination`); re-fetches automatically when the page changes
- `getEntry` loads only the single file matching the slug
- Glob loading is lazy by default — each `.md` file becomes its own chunk
