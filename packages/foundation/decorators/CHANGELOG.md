# @praxisjs/decorators

## 0.7.4

### Patch Changes

- Updated dependencies [994c581]
  - @praxisjs/core@1.4.0

## 0.7.3

### Patch Changes

- Updated dependencies [5a10864]
  - @praxisjs/core@1.3.0

## 0.7.2

### Patch Changes

- 2c61a25: Refresh dependencies across workspace to improve stability and security.

  Bumped versions of several packages, including @types/node, eslint, and unocss, to enhance compatibility and security.

## 0.7.1

### Patch Changes

- Updated dependencies [6c353ba]
  - @praxisjs/core@1.2.0

## 0.7.0

### Minor Changes

- 2b8c768: Redesign `@History` as a field decorator with `HistoryOf` type helper

  `@History` now decorates a separate field (not the `@State` field itself). The first argument is the name of the field to track, the second is the optional limit. Type the field with `HistoryOf<Class, 'field'>` for full intellisense.

  `WithHistory` type helper has been removed in favour of `HistoryOf`.

  `createFieldDecorator` is now generic and works on any class, not just `StatefulComponent`.

  ```ts
  // Before
  @History(100)
  @State()
  text = ''
  // this.textHistory — no intellisense, required interface merging

  // After
  @State()
  text = ''

  @History('text', 100)
  textHistory!: HistoryOf<MyClass, 'text'>
  // this.textHistory.undo()    ✓
  // this.textHistory.canUndo() ✓
  ```

## 0.6.1

### Patch Changes

- 72cd9a8: Fix method decorators rejecting typed parameters

  `createMethodDecorator` used `unknown[]` for the method value type, which caused TypeScript to reject decorated methods with typed parameters (e.g. `async loadUser(id: number)`). Changed to `any[]` so the decorator accepts any async method signature. Updated the `Task`, `Queue`, and `Pool` decorator casts in `@praxisjs/concurrent` accordingly.

## 0.6.0

### Minor Changes

- 029ef04: Add `@Until(propName)` decorator. Replaces the decorated method with one that returns a `Promise` resolving to the first truthy value of the named signal or computed property.

### Patch Changes

- 029ef04: `@Memo` falls back to object identity for non-JSON-serializable arguments (circular references, class instances). `@Debounce` cancels its pending timer on component unmount. `@Throttle` clamps negative `ms` values to `0`. `@Virtual` throws when `itemHeight` is `0` or negative.
- Updated dependencies [029ef04]
- Updated dependencies [029ef04]
- Updated dependencies [029ef04]
  - @praxisjs/core@1.1.0

## 0.5.0

### Minor Changes

- feaa478: Add decorator factory helpers and new built-in decorators.

  **Decorator factories** — low-level building blocks for authoring custom decorators:

  - `createFieldDecorator` / `FieldBehavior` / `FieldBinding`
  - `createClassDecorator` / `ClassBehavior` / `ClassEnhancement`
  - `createMethodDecorator` / `MethodBehavior`
  - `createLifecycleMethodDecorator` / `LifecycleMethodBehavior`
  - `createGetterDecorator` / `GetterBehavior`
  - `createGetterObserverDecorator` / `GetterObserverBehavior`

  **New built-in decorators:**

  - `@Compose` — mixes a `Composable` class into a component, binding its reactive properties and lifecycle hooks
  - `@Resource` — declares an async resource on a component field, replacing the standalone `resource()` function from `@praxisjs/core`

### Patch Changes

- Updated dependencies [3372878]
  - @praxisjs/core@1.0.0

## 0.4.3

### Patch Changes

- ea59035: Fix three bugs in `Lazy`, `Virtual`, and `Watch` decorators

  **`Lazy` / `Virtual` — incompatible type constraint**
  Both decorators constrained their generic to `new (...args: any[]) => RootComponent`, where the bare `RootComponent` defaults to `RootComponent<Record<string, never>>`. This made the constraint incompatible with `StatefulComponent`, whose `_rawProps` is typed as `Record<string, unknown>`, causing a TypeScript error at the call site. Changed the constraint to `RootComponent<Record<string, any>>` so any component subclass is accepted.

  **`Lazy` — infinite recursion on render after becoming visible**
  `_originalRender` was initialized to `this.render.bind(this)`, which at instance-creation time resolves to `LazyWrapper.render` (the override itself). Calling `render()` after the component became visible would then recurse infinitely. Fixed by capturing `constructor.prototype.render` — the parent class's render method — instead.

  **`Watch` — reactive effect leaked after component unmount**
  The decorator created a reactive `effect()` on `onMount` but never called the returned stop function on unmount. This caused the effect to keep running and the handler to keep firing even after the component was unmounted, resulting in a memory leak and stale callbacks. The decorator now hooks into `onUnmount` to stop the effect and preserves any existing `onUnmount` implementation on the instance.

- Updated dependencies [d11a10a]
  - @praxisjs/core@0.4.2

## 0.4.2

### Patch Changes

- fe39901: fix(decorators): fix infinite recursion in `@History` decorator `undo()`/`redo()`

  `originalUndo` and `originalRedo` were closures that captured `h` by reference. By the time they were called, `h.undo` and `h.redo` had already been overwritten by the augmented versions, creating an infinite cycle that resulted in a stack overflow.

  The fix captures the original methods by value using `.bind(h)` (`const _undo = h.undo.bind(h)`) before overwriting them, breaking the cycle and satisfying the `unbound-method` lint rule.

- Updated dependencies [fe39901]
  - @praxisjs/core@0.4.1

## 0.4.1

### Patch Changes

- 966efdc: Fix JSX prop typing for `StatelessComponent` to automatically accept reactive values (`() => T`) without requiring manual declaration. `LibraryManagedAttributes` now uses `InstancePropsOf` directly instead of intersecting with the raw constructor props, preventing the erroneous `T | (T & (() => T))` type expansion.

  `InstancePropsOf` now uses `_rawProps` to infer props for class components decorated with `@Prop()`, providing accurate JSX prop types without manual interface declarations.

  The `@Emit` decorator type signature was relaxed from `unknown` to `any` to allow broader method compatibility. Devtools `Panel` and `DevToolsApp` components were refactored to use `@Prop()` and `@Emit()` decorators instead of manual props casting.

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
