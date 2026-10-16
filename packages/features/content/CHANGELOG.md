# @praxisjs/content

## 0.2.3

### Patch Changes

- 05518dc: Depend on other `@praxisjs/*` packages through caret ranges (`^2.3.0`) instead of exact versions (`2.3.0`), and accept any `@praxisjs/css` 0.3.x as the peer of `@praxisjs/vite-plugin`. Exact versions made npm install a second copy of a package as soon as two releases disagreed, and turned upgrades into peer conflicts that npm could not resolve (`ERESOLVE`, or a crash in its peer resolution).
- Updated dependencies [05518dc]
  - @praxisjs/core@2.3.1
  - @praxisjs/decorators@2.0.1

## 0.2.2

### Patch Changes

- 75115a9: Decorated fields are defined by their innermost decorator. With `@praxisjs/vite-plugin`, `@State()`, `@Prop()`, every built-in field decorator and `createFieldDecorator` bindings install their property directly with the field's initial value instead of replacing a plain value, which kept every instance in V8's slow dictionary mode. New `addClaimableInitializer(context, init)` export for field decorators written against the TC39 API.
- 75115a9: Field decorators throw a `TypeError` when the class is defined if they decorate an `accessor`, naming the member to fix. Covers `@State()`, `@Prop()`, every built-in field decorator and `createFieldDecorator` bindings. New `assertFieldContext(context, label?)` export for field decorators written against the TC39 API directly.
- 75115a9: Published packages no longer contain their tests: package builds compile `src` without `src/**/__tests__` (through a `tsconfig.build.json`), and each package's `files` leaves test sources and stale compiled tests out of the tarball. `pnpm typecheck` still type-checks the tests.
- 75115a9: Performance pass and bug fixes across the feature packages.
  - `@praxisjs/router`: static paths are matched through an index and dynamic ones with a single regex run; `RouterView` keeps a shared layout mounted across navigations; new `router.isActive(path)` (used by `Link`, so a navigation re-evaluates only the links whose state changed) and `router.destroy()`. Fixes regex characters in route paths (`.`, `(`, `+`...) being treated as patterns, and a router replaced by `createRouter()` still reacting to `popstate`. `@Route` no longer wraps the class, and the field decorators share one accessor.
  - `@praxisjs/store`: plugin-wrapped actions keep their identity across reads, extensions are bound once, and writing a field inside an effect no longer subscribes the effect to it. `constructor` and inherited `Object.prototype` members are no longer reported as actions. `@Store` caches the singleton.
  - `@praxisjs/motion`: `@Tween` and `@Spring` share one accessor per field and no longer start a frame loop at construction; `tween()`/`spring()` react to target writes without an effect. Fixes `reset()` leaving a tween marked as playing.
  - `@praxisjs/di`: cached singletons and tokens resolve without allocating, `@Injectable` registers the class itself instead of a subclass, and a dependency cycle through `inject()` calls in constructors now reports `[DI] Circular dependency detected` instead of overflowing the stack.
  - `@praxisjs/fsm`: `send()` and `reset()` no longer subscribe the calling effect to the machine state, transitions allocate nothing per send, and `@StateMachine` shares one accessor.
  - `@praxisjs/head`: tag diffing without `JSON.stringify` or a full `<head>` query per update; updating or removing an entry below the top one leaves the document alone, and removing an unknown id no longer resets the title.
  - `@praxisjs/content`: each entry is loaded, parsed and rendered once and shared by `getCollection`, `getPage` and `getEntry`; `getEntry` looks the slug up in an index; schema defaults are built once per class.

- 75115a9: Smaller production bundles. The framework and feature packages are marked `"sideEffects": false`, so bundlers leave out the modules an app does not use (`For`/`Index` and `selector()` were kept in every bundle by their shape keepers). `@praxisjs/core`'s graph gates its observer instrumentation on a boolean that minifiers fold away when no observer is ever installed. `@praxisjs/runtime` passes `Index`'s positional update to the list view, so `For`-only apps leave it out, and builds its event prop table from camel-case names. `@praxisjs/devtools` is built one file per module and its decorators check `process.env.NODE_ENV` inline, so `@Trace`/`@Debug` in production code no longer bundle the registry and the panel. `@praxisjs/vite-plugin` serves TypeScript's decorator helpers and the claimed fields' helper from one virtual module (`virtual:praxisjs/decorators`) instead of writing them into every decorated file, and replaces the identical copies `tsc` wrote into ES module libraries.
- Updated dependencies [75115a9]
- Updated dependencies [75115a9]
- Updated dependencies [75115a9]
- Updated dependencies [75115a9]
- Updated dependencies [75115a9]
- Updated dependencies [75115a9]
- Updated dependencies [75115a9]
- Updated dependencies [75115a9]
- Updated dependencies [75115a9]
- Updated dependencies [75115a9]
- Updated dependencies [75115a9]
  - @praxisjs/decorators@2.0.0
  - @praxisjs/core@2.3.0

## 0.2.1

### Patch Changes

- 50e8d20: `getCollection()` caches the loaded, parsed and rendered entries per collection (callers get a copy of the array; failed loads are not cached), so list and detail pages — or every page of an SSG run — no longer re-parse all the markdown.
- Updated dependencies [a97a37c]
- Updated dependencies [c7a5950]
  - @praxisjs/core@2.2.0
  - @praxisjs/decorators@1.7.0

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
