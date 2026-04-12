# @praxisjs/devtools

## 0.2.13

### Patch Changes

- 994c581: Updated internals to use the new `StatelessComponent` default type parameter and automatic `@Prop()` JSX prop inference from `@praxisjs/core` and `@praxisjs/jsx`.
- Updated dependencies [994c581]
- Updated dependencies [994c581]
  - @praxisjs/jsx@0.4.0
  - @praxisjs/core@1.4.0
  - @praxisjs/decorators@0.7.4
  - @praxisjs/runtime@0.2.12

## 0.2.12

### Patch Changes

- Updated dependencies [5a10864]
  - @praxisjs/core@1.3.0
  - @praxisjs/decorators@0.7.3
  - @praxisjs/runtime@0.2.11
  - @praxisjs/jsx@0.3.10

## 0.2.11

### Patch Changes

- 2c61a25: Refresh dependencies across workspace to improve stability and security.

  Bumped versions of several packages, including @types/node, eslint, and unocss, to enhance compatibility and security.

- Updated dependencies [2c61a25]
  - @praxisjs/decorators@0.7.2
  - @praxisjs/runtime@0.2.10
  - @praxisjs/jsx@0.3.9

## 0.2.10

### Patch Changes

- Updated dependencies [6c353ba]
  - @praxisjs/core@1.2.0
  - @praxisjs/runtime@0.2.9
  - @praxisjs/decorators@0.7.1
  - @praxisjs/jsx@0.3.8

## 0.2.9

### Patch Changes

- Updated dependencies [2b8c768]
  - @praxisjs/decorators@0.7.0
  - @praxisjs/runtime@0.2.8
  - @praxisjs/jsx@0.3.7

## 0.2.8

### Patch Changes

- Updated dependencies [72cd9a8]
  - @praxisjs/decorators@0.6.1
  - @praxisjs/runtime@0.2.7
  - @praxisjs/jsx@0.3.6

## 0.2.7

### Patch Changes

- 029ef04: Event bus handlers no longer short-circuit on the first error — all handlers run and errors are collected into an `AggregateError`.
- Updated dependencies [029ef04]
- Updated dependencies [029ef04]
- Updated dependencies [029ef04]
- Updated dependencies [029ef04]
- Updated dependencies [029ef04]
- Updated dependencies [029ef04]
  - @praxisjs/core@1.1.0
  - @praxisjs/decorators@0.6.0
  - @praxisjs/runtime@0.2.6
  - @praxisjs/jsx@0.3.5

## 0.2.6

### Patch Changes

- 4d15755: Refactor `@Debug` and `@Trace` internals to use the new decorator factory helpers from `@praxisjs/decorators` (`createFieldDecorator`, `createMethodDecorator`, `createGetterObserverDecorator`, `createClassDecorator`). No changes to public API or behavior.
- Updated dependencies [3372878]
- Updated dependencies [feaa478]
  - @praxisjs/core@1.0.0
  - @praxisjs/decorators@0.5.0
  - @praxisjs/runtime@0.2.5
  - @praxisjs/jsx@0.3.4

## 0.2.5

### Patch Changes

- 00119ca: Regenerate UnoCSS bundle
- Updated dependencies [ea59035]
- Updated dependencies [d11a10a]
  - @praxisjs/decorators@0.4.3
  - @praxisjs/core@0.4.2
  - @praxisjs/runtime@0.2.4
  - @praxisjs/jsx@0.3.3

## 0.2.4

### Patch Changes

- 9fa8dd1: fix(devtools): guard against undefined `entry` in `TimelineRow`

  `entry` is typed as `TimelineEntry | undefined`, but `render()` accessed `entry.data` unconditionally, which would throw at runtime when no entry is provided. Added an early `null` return guard and a local `const entry = this.entry` binding that also fixes bare `entry` references in JSX that were missing the `this.` prefix.

- Updated dependencies [fe39901]
- Updated dependencies [fe39901]
  - @praxisjs/decorators@0.4.2
  - @praxisjs/core@0.4.1
  - @praxisjs/runtime@0.2.3
  - @praxisjs/jsx@0.3.2

## 0.2.3

### Patch Changes

- 966efdc: Fix JSX prop typing for `StatelessComponent` to automatically accept reactive values (`() => T`) without requiring manual declaration. `LibraryManagedAttributes` now uses `InstancePropsOf` directly instead of intersecting with the raw constructor props, preventing the erroneous `T | (T & (() => T))` type expansion.

  `InstancePropsOf` now uses `_rawProps` to infer props for class components decorated with `@Prop()`, providing accurate JSX prop types without manual interface declarations.

  The `@Emit` decorator type signature was relaxed from `unknown` to `any` to allow broader method compatibility. Devtools `Panel` and `DevToolsApp` components were refactored to use `@Prop()` and `@Emit()` decorators instead of manual props casting.

- Updated dependencies [966efdc]
  - @praxisjs/jsx@0.3.1
  - @praxisjs/decorators@0.4.1
  - @praxisjs/runtime@0.2.2

## 0.2.2

### Patch Changes

- Updated dependencies [339a97d]
  - @praxisjs/jsx@0.3.0

## 0.2.1

### Patch Changes

- f52354d: Add `@Computed()` decorator to `@praxisjs/decorators` for declaring read-only reactive getters backed by a cached `computed()` signal. The getter recomputes automatically when any `@State` or `@Prop` dependency changes, and the result is cached until a dependency is invalidated — unlike a plain getter which recalculates on every read.

  `@Debug()` in `@praxisjs/devtools` now supports `@Computed()` getters (`ClassGetterDecoratorContext`) in addition to fields and methods, allowing computed values to be tracked and historized in the devtools panel.

  Also fixes a bug in the `computed()` primitive where an erroneous `track(recompute)` call caused premature dependency tracking on signal creation.

- Updated dependencies [f52354d]
  - @praxisjs/decorators@0.4.0
  - @praxisjs/core@0.4.0
  - @praxisjs/runtime@0.2.1
  - @praxisjs/jsx@0.2.1

## 0.2.0

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
  - @praxisjs/decorators@0.3.0
  - @praxisjs/runtime@0.2.0
  - @praxisjs/core@0.3.0
  - @praxisjs/jsx@0.2.0
  - @praxisjs/shared@0.2.0

## 0.1.1

### Patch Changes

- Updated dependencies [f48dbc4]
  - @praxisjs/core@0.2.0
  - @praxisjs/runtime@0.1.1

## 0.1.0

### Minor Changes

- aaf7dab: Initial beta release

### Patch Changes

- Updated dependencies [aaf7dab]
  - @praxisjs/core@0.1.0
  - @praxisjs/jsx@0.1.0
  - @praxisjs/runtime@0.1.0
  - @praxisjs/shared@0.1.0
