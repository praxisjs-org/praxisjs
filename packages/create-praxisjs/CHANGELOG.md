# create-praxisjs

## 0.3.20

### Patch Changes

- 9c7a165: fix: constrain `@State` and `@DeepState` to reactive classes only

  Introduces `ReactiveHost` (`{ _stateDirty: boolean }`) exported from `@praxisjs/decorators`. `@State` and `@DeepState` now use `createFieldDecorator<ReactiveHost>` with a generic `<This extends ReactiveHost, Value>` constraint, producing a TS error when applied to plain classes.

  `createFieldDecorator` now returns a generic function `<This extends T, Value>` so TypeScript infers the actual class type at the call site and checks the constraint against it instead of doing a fixed structural check.

  `@Store` is simplified to a plain class decorator (no longer uses `createClassDecorator`). A new `ReactiveStore` base class is exported from `@praxisjs/store` — store classes must extend it to satisfy the `ReactiveHost` constraint required by `@State` and `@DeepState`. Template updated accordingly.

## 0.3.19

### Patch Changes

- 9affc5c: Add `syncedSignal` primitive and fix internal dead-code branches.

  `syncedSignal(channelName, initialValue)` creates a signal that stays in sync across browser tabs in real-time via `BroadcastChannel`. Writes in any tab are broadcast to all other open tabs automatically.

  `batch()` — simplified the flush path by replacing the unreachable `batchQueue ?? new Set()` fallback with a direct `if (isOuter && batchQueue)` guard.

  `@praxisjs/composables` — removed no-op class field initializers (`_handler = () => {}`) that were immediately overwritten in `setup()`. Fields are now declared with `!` or typed as optional to reflect their real lifecycle.

## 0.3.18

### Patch Changes

- aaf8a13: Fix `@Watch` (and `@When`, `@OnCommand`) TypeScript error when the decorated method uses typed parameters.

  `createLifecycleMethodDecorator` typed the decorated method value as `(...args: unknown[]) => void`. Because function parameters are checked contravariantly, TypeScript rejected methods with specific parameter types like `WatchVals<this, ...>` or `WatchVal<this, ...>`, producing an "Unable to resolve signature of method decorator" error.

  Changed `unknown[]` to `any[]` to match the existing pattern in `createMethodDecorator`, which accepts any method signature.

  `@Watch` with multiple props now coalesces simultaneous signal changes into a single callback invocation. When two or more watched props change in the same synchronous block, the callback fires once (via `queueMicrotask`) with the final values and the original pre-change values — instead of firing once per changed prop. Signal writes made inside the callback are automatically batched.

  `computed()` subscriber notification is now also coalesced via `queueMicrotask`. When multiple signal dependencies of a computed change in the same synchronous block, its leaf subscribers (DOM effects, `@Watch`, `.subscribe()`) are notified once with the final value. Dirty propagation through chained computeds still happens synchronously, so reads immediately after a signal change always return the correct derived value.

## 0.3.17

### Patch Changes

- 994c581: Sync template `package.json` dependency versions with the latest package releases.

## 0.3.16

### Patch Changes

- 5a10864: `StatelessComponent` now exposes an optional typed `children` prop. Accessing `this.props.children` is now valid without declaring `children` in the generic type parameter `T`.

## 0.3.15

### Patch Changes

- 7e90df6: Refactor `@Injectable` and `@Scope` to use `ClassBehavior` / `createClassDecorator` from `@praxisjs/decorators`. Simplify `Container.instantiate` to plain `new target()`, removing the internal TC39 metadata maps (`constructorDepsMap`, `propDepsMap`) and the associated `setConstructorDeps` / `setPropDep` helpers.

## 0.3.14

### Patch Changes

- b8e0c8d: Update eslint from 10.0.2 to 10.1.0

## 0.3.13

### Patch Changes

- 92880d1: Remove reflect-metadata dependency and implement TC39-compatible metadata storage

  The DI container now uses WeakMaps for storing constructor and property dependency metadata instead of relying on the reflect-metadata polyfill. This reduces external dependencies while maintaining full API compatibility. New helpers `setConstructorDeps` and `setPropDep` are exported for manual metadata management when needed.

## 0.3.12

### Patch Changes

- 2c61a25: Refresh dependencies across workspace to improve stability and security.

  Bumped versions of several packages, including @types/node, eslint, and unocss, to enhance compatibility and security.

## 0.3.11

### Patch Changes

- 46c0593: Update template dependencies to pick up `untrack` and component mounting isolation from `@praxisjs/core` and `@praxisjs/runtime`

## 0.3.10

### Patch Changes

- 49e4690: Update template dependencies to pick up redesigned `@praxisjs/decorators` and `@praxisjs/concurrent` APIs

## 0.3.9

### Patch Changes

- 72cd9a8: Update template dependencies to pick up latest bug fixes in `@praxisjs/decorators` and `@praxisjs/concurrent`

## 0.3.8

### Patch Changes

- 029ef04: Scoped package names (`@org/pkg`) are now preserved correctly during scaffolding. Template and `_package.json` errors report actionable messages instead of raw exceptions.

## 0.3.7

### Patch Changes

- 790ed21: Fix lazy-loaded page templates missing `export default`.

  Pages in the `router` and `full` templates that are loaded via `Lazy()` now use `export default class` instead of a named export, which is required for the lazy loader to resolve `module.default` at runtime.

## 0.3.6

### Patch Changes

- 87a5bbe: Update project templates to reflect the decorator-first API: use `@Store`, `@Route`, and `@RouterConfig` decorators, and initialize DevTools via dynamic import after `render()`.

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
