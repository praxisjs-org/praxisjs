# @praxisjs/decorators

## 0.4.0

### Minor Changes

- f52354d: Add `@Computed()` decorator to `@praxisjs/decorators` for declaring read-only reactive getters backed by a cached `computed()` signal. The getter recomputes automatically when any `@State` or `@Prop` dependency changes, and the result is cached until a dependency is invalidated — unlike a plain getter which recalculates on every read.

  `@Debug()` in `@praxisjs/devtools` now supports `@Computed()` getters (`ClassGetterDecoratorContext`) in addition to fields and methods, allowing computed values to be tracked and historized in the devtools panel.

  Also fixes a bug in the `computed()` primitive where an erroneous `track(recompute)` call caused premature dependency tracking on signal creation.

### Patch Changes

- Updated dependencies [f52354d]
  - @praxisjs/core@0.4.0

## 0.3.0

### Minor Changes

- bb0d4f8: **Refactor decorator system and component architecture across PraxisJS packages**

  - Replaced legacy decorator signatures (`constructor`, `target`, `propertyKey`, method descriptor) with the standard TC39 decorator context API (`ClassDecoratorContext`, `ClassFieldDecoratorContext`, `ClassMethodDecoratorContext`) across `@praxisjs/decorators`, `@praxisjs/store`, `@praxisjs/concurrent`, `@praxisjs/router`, `@praxisjs/motion`, `@praxisjs/di`, and `@praxisjs/fsm`.
  - Introduced `StatefulComponent` and `StatelessComponent` as the new base classes, replacing the deprecated `BaseComponent`/`Function Component` pattern, across `@praxisjs/core`, `@praxisjs/runtime`, `@praxisjs/devtools`, and templates.
  - Implemented core rendering functionality in `@praxisjs/runtime` (`mountChildren`, `mountComponent`, reactive scope management) and removed the deprecated `renderer.ts`.
  - Refactored `@praxisjs/jsx` to delegate rendering to `@praxisjs/runtime` and improved type safety with `flattenChildren` and `isComponent` utilities.
  - Updated internal module structure with new `internal` exports in `package.json` files for shared utilities and types.
  - Removed `experimentalDecorators`/`emitDecoratorMetadata` from `tsconfig.json` in favor of native decorator support.

### Patch Changes

- Updated dependencies [bb0d4f8]
  - @praxisjs/core@0.3.0
  - @praxisjs/shared@0.2.0

## 0.2.0

### Minor Changes

- f48dbc4: Introduce WithHistory<T, K> utility type for better TypeScript inference when using the @History decorator, and fix performance issues in the history() primitive.

  Changes:

  @praxisjs/decorators: Added WithHistory<T, K> type that maps a property key to its corresponding \*History accessor type, enabling proper type-checking on decorated classes.
  @praxisjs/decorators: Simplified @History decorator internals — replaced verbose getOwnPropertyDescriptor lookups with direct property access (this[propertyKey]), reducing complexity.
  @praxisjs/core: Fixed history() to use peek() when reading \_past and \_current inside the tracking effect, preventing unnecessary re-runs caused by reactive reads during history recording.
  @praxisjs/core: Added an \_initialized guard so the first value is captured without pushing an empty entry into the past stack.

### Patch Changes

- Updated dependencies [f48dbc4]
  - @praxisjs/core@0.2.0

## 0.1.0

### Minor Changes

- aaf7dab: Initial beta release

### Patch Changes

- Updated dependencies [aaf7dab]
  - @praxisjs/core@0.1.0
  - @praxisjs/jsx@0.1.0
  - @praxisjs/shared@0.1.0
