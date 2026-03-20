# create-praxisjs

## 0.3.5

### Patch Changes

- d11a10a: Update template dependency versions to pick up latest bug fixes

  Bumps `@praxisjs/decorators`, `@praxisjs/core`, and `@praxisjs/devtools` across the `minimal`, `router`, and `full` templates so that projects scaffolded with `create-praxisjs` start with the latest releases. Notable fixes included:

  - `effect()` stop now correctly prevents re-runs (`@praxisjs/core`)
  - `@Watch` no longer leaks reactive effects after unmount — the effect is now stopped in `onUnmount` (`@praxisjs/decorators`)
  - `@Lazy` no longer recurses infinitely when `render()` is called after the component becomes visible (`@praxisjs/decorators`)
  - `@Lazy` / `@Virtual` type constraint widened to accept any `StatefulComponent` subclass (`@praxisjs/decorators`)
  - Devtools panel CSS bundle regenerated with new UnoCSS utility aliases (`@praxisjs/devtools`)

## 0.3.4

### Patch Changes

- fe39901: chore(create-praxisjs): bump dependencies to pick up bug fixes in core, decorators, router and store

## 0.3.3

### Patch Changes

- 966efdc: Fix JSX prop typing for `StatelessComponent` to automatically accept reactive values (`() => T`) without requiring manual declaration. `LibraryManagedAttributes` now uses `InstancePropsOf` directly instead of intersecting with the raw constructor props, preventing the erroneous `T | (T & (() => T))` type expansion.

  `InstancePropsOf` now uses `_rawProps` to infer props for class components decorated with `@Prop()`, providing accurate JSX prop types without manual interface declarations.

  The `@Emit` decorator type signature was relaxed from `unknown` to `any` to allow broader method compatibility. Devtools `Panel` and `DevToolsApp` components were refactored to use `@Prop()` and `@Emit()` decorators instead of manual props casting.

## 0.3.2

### Patch Changes

- 339a97d: Bump `@praxisjs/jsx` to `^0.2.1` in scaffolded project templates to pick up reactive component prop typing support.

## 0.3.1

### Patch Changes

- f52354d: Add `@Computed()` decorator to `@praxisjs/decorators` for declaring read-only reactive getters backed by a cached `computed()` signal. The getter recomputes automatically when any `@State` or `@Prop` dependency changes, and the result is cached until a dependency is invalidated — unlike a plain getter which recalculates on every read.

  `@Debug()` in `@praxisjs/devtools` now supports `@Computed()` getters (`ClassGetterDecoratorContext`) in addition to fields and methods, allowing computed values to be tracked and historized in the devtools panel.

  Also fixes a bug in the `computed()` primitive where an erroneous `track(recompute)` call caused premature dependency tracking on signal creation.

## 0.3.0

### Minor Changes

- bb0d4f8: **Refactor decorator system and component architecture across PraxisJS packages**

  - Replaced legacy decorator signatures (`constructor`, `target`, `propertyKey`, method descriptor) with the standard TC39 decorator context API (`ClassDecoratorContext`, `ClassFieldDecoratorContext`, `ClassMethodDecoratorContext`) across `@praxisjs/decorators`, `@praxisjs/store`, `@praxisjs/concurrent`, `@praxisjs/router`, `@praxisjs/motion`, `@praxisjs/di`, and `@praxisjs/fsm`.
  - Introduced `StatefulComponent` and `StatelessComponent` as the new base classes, replacing the deprecated `BaseComponent`/`Function Component` pattern, across `@praxisjs/core`, `@praxisjs/runtime`, `@praxisjs/devtools`, and templates.
  - Implemented core rendering functionality in `@praxisjs/runtime` (`mountChildren`, `mountComponent`, reactive scope management) and removed the deprecated `renderer.ts`.
  - Refactored `@praxisjs/jsx` to delegate rendering to `@praxisjs/runtime` and improved type safety with `flattenChildren` and `isComponent` utilities.
  - Updated internal module structure with new `internal` exports in `package.json` files for shared utilities and types.
  - Removed `experimentalDecorators`/`emitDecoratorMetadata` from `tsconfig.json` in favor of native decorator support.

## 0.2.0

### Minor Changes

- f48dbc4: Introduce WithHistory<T, K> utility type for better TypeScript inference when using the @History decorator, and fix performance issues in the history() primitive.

  Changes:

  @praxisjs/decorators: Added WithHistory<T, K> type that maps a property key to its corresponding \*History accessor type, enabling proper type-checking on decorated classes.
  @praxisjs/decorators: Simplified @History decorator internals — replaced verbose getOwnPropertyDescriptor lookups with direct property access (this[propertyKey]), reducing complexity.
  @praxisjs/core: Fixed history() to use peek() when reading \_past and \_current inside the tracking effect, preventing unnecessary re-runs caused by reactive reads during history recording.
  @praxisjs/core: Added an \_initialized guard so the first value is captured without pushing an empty entry into the past stack.

## 0.1.2

### Patch Changes

- 564f711: Fix signals not working due to missing useDefineForClassFields: false in template tsconfigs

## 0.1.1

### Patch Changes

- df60c6d: Fix missing shebang in CLI binary

## 0.1.0

### Minor Changes

- aaf7dab: Initial beta release
