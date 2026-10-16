# @praxisjs/head

## 0.3.2

### Patch Changes

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
  - @praxisjs/shared@0.3.2

## 0.3.1

### Patch Changes

- 98f3a18: Updating the head only adds and removes the tags that actually changed instead of recreating every managed tag on each update.
- Updated dependencies [a97a37c]
- Updated dependencies [c7a5950]
  - @praxisjs/core@2.2.0
  - @praxisjs/decorators@1.7.0

## 0.3.0

### Minor Changes

- ef46e56: Add a `@praxisjs/head/internal` entry point exporting `resetHeadState()`, so `@praxisjs/ssg`'s prerender runner can clear `<head>` tag state between routes rendered in the same Node process.

### Patch Changes

- Updated dependencies [1ec5b2f]
  - @praxisjs/core@2.1.0
  - @praxisjs/decorators@1.6.1

## 0.2.6

### Patch Changes

- Updated dependencies [b24f603]
  - @praxisjs/decorators@1.6.0

## 0.2.5

### Patch Changes

- Updated dependencies [f1b7ee7]
  - @praxisjs/decorators@1.5.1

## 0.2.4

### Patch Changes

- Updated dependencies [55e645d]
- Updated dependencies [8ab6426]
  - @praxisjs/decorators@1.5.0
  - @praxisjs/core@2.0.0
  - @praxisjs/shared@0.3.1

## 0.2.3

### Patch Changes

- Updated dependencies [7d87288]
  - @praxisjs/core@1.8.3
  - @praxisjs/decorators@1.4.1

## 0.2.2

### Patch Changes

- Updated dependencies [bcaad96]
- Updated dependencies [376e38c]
  - @praxisjs/decorators@1.4.0
  - @praxisjs/core@1.8.2

## 0.2.1

### Patch Changes

- Updated dependencies [dc031d0]
  - @praxisjs/core@1.8.1
  - @praxisjs/decorators@1.3.1

## 0.2.0

### Minor Changes

- f8ccd4b: Add `preload` and `prefetch` link support to `@Head` / `HeadConfig`.
  - `preload?: LinkPreload[]` — emits `<link rel="preload">` tags with `href`, `as`, optional `type` and `crossOrigin`
  - `prefetch?: LinkPrefetch[]` — emits `<link rel="prefetch">` tags with `href` and optional `as`

  Both fields are reactive when used inside a getter and cleaned up automatically on component unmount.

### Patch Changes

- Updated dependencies [80442e0]
  - @praxisjs/decorators@1.3.0
  - @praxisjs/core@1.8.0
  - @praxisjs/shared@0.3.0

## 0.1.2

### Patch Changes

- Updated dependencies [3fb2309]
  - @praxisjs/decorators@1.2.0

## 0.1.1

### Patch Changes

- Updated dependencies [a0372af]
  - @praxisjs/decorators@1.1.1

## 0.1.0

### Minor Changes

- 2837664: Initial release of `@praxisjs/head` — reactive document head management via `@Head` class decorator. Supports title, description, canonical, arbitrary meta[], og:_, and twitter:_. Stack-based with automatic cleanup on component unmount.

### Patch Changes

- Updated dependencies [378cc54]
  - @praxisjs/core@1.7.0
  - @praxisjs/decorators@1.1.0
