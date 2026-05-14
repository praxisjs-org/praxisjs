# @praxisjs/jsx

## 0.4.2

### Patch Changes

- @praxisjs/runtime@0.2.14

## 0.4.1

### Patch Changes

- @praxisjs/runtime@0.2.13

## 0.4.0

### Minor Changes

- 994c581: Refactor `@praxisjs/jsx` HTML/SVG type definitions to a React-style layered architecture.

  **Breaking change (type-only):** the `[key: string]: HTMLAttributes` catch-all index signature has been removed from `JSX.IntrinsicElements`. Typos like `<dvi>` are now compile-time errors instead of silently resolving to `HTMLAttributes`.

  **What's new:**

  - `LiteralUnion<T>` widening applied to all string-literal attribute unions (`ButtonType`, `HTMLInputTypeAttribute`, `FormMethod`, `LinkTarget`, `ReferrerPolicy`, etc.) — a `string`-typed variable is now assignable without a cast, while IDE autocomplete still surfaces the canonical values
  - `CSSProperties` type for object-style `style` props with full camelCase CSS property autocomplete and CSS custom property (`--xxx`) support
  - `AriaAttributes` — complete WAI-ARIA 1.2 attribute set
  - `DOMAttributes<T extends EventTarget>` — all event handlers with `currentTarget` narrowed to the host element type
  - `HTMLAttributes<T extends Element>` — generic base with element-specific `ref: (el: T) => void`
  - 40+ per-element attribute interfaces (`ButtonHTMLAttributes`, `InputHTMLAttributes`, `AnchorHTMLAttributes`, `ImgHTMLAttributes`, `FormHTMLAttributes`, `SelectHTMLAttributes`, `TextareaHTMLAttributes`, `VideoHTMLAttributes`, `DialogHTMLAttributes`, …)
  - `SVGAttributes<T>` covering all SVG elements the runtime routes through the SVG namespace
  - Full HTML element coverage: ~120 intrinsic element entries across metadata, sectioning, grouping, text-level, embedded, form, interactive, tabular, and scripting categories
  - All new attribute interfaces are re-exported from `@praxisjs/jsx` for use in application code

  `InstancePropsOf` now automatically infers `@Prop()` and `@State()` fields from `StatefulComponent` subclasses as JSX props. A `FrameworkKeys` template-literal pattern (`_${string}` plus lifecycle method names) strips all framework internals, so no explicit prop declaration is needed.

### Patch Changes

- @praxisjs/runtime@0.2.12

## 0.3.10

### Patch Changes

- @praxisjs/runtime@0.2.11

## 0.3.9

### Patch Changes

- @praxisjs/runtime@0.2.10

## 0.3.8

### Patch Changes

- Updated dependencies [6c353ba]
  - @praxisjs/runtime@0.2.9

## 0.3.7

### Patch Changes

- @praxisjs/runtime@0.2.8

## 0.3.6

### Patch Changes

- @praxisjs/runtime@0.2.7

## 0.3.5

### Patch Changes

- Updated dependencies [029ef04]
  - @praxisjs/runtime@0.2.6

## 0.3.4

### Patch Changes

- @praxisjs/runtime@0.2.5

## 0.3.3

### Patch Changes

- @praxisjs/runtime@0.2.4

## 0.3.2

### Patch Changes

- @praxisjs/runtime@0.2.3

## 0.3.1

### Patch Changes

- 966efdc: Fix JSX prop typing for `StatelessComponent` to automatically accept reactive values (`() => T`) without requiring manual declaration. `LibraryManagedAttributes` now uses `InstancePropsOf` directly instead of intersecting with the raw constructor props, preventing the erroneous `T | (T & (() => T))` type expansion.

  `InstancePropsOf` now uses `_rawProps` to infer props for class components decorated with `@Prop()`, providing accurate JSX prop types without manual interface declarations.

  The `@Emit` decorator type signature was relaxed from `unknown` to `any` to allow broader method compatibility. Devtools `Panel` and `DevToolsApp` components were refactored to use `@Prop()` and `@Emit()` decorators instead of manual props casting.

  - @praxisjs/runtime@0.2.2

## 0.3.0

### Minor Changes

- 339a97d: Component props now accept reactive getters in JSX. Any prop can be passed as a plain value (static) or as an arrow function (reactive) — the runtime tracks signal dependencies inside the getter and updates the DOM automatically.

  ```tsx
  // static — read once at mount
  <Counter value={this.count} />

  // reactive — updates whenever this.count changes
  <Counter value={() => this.count} />
  ```

  This applies to both `StatelessComponent` (via the generic props interface) and `StatefulComponent` (via `@Prop()`, which already unwrapped getters at runtime — now the types reflect this).

  **Changes:**

  - `PropsOf<T>` now maps each prop key `K` to `Reactive<P[K]>` (`P[K] | (() => P[K])`), so the JSX type checker accepts getters for any component prop without requiring the component author to annotate them manually.
  - `InstancePropsOf<C>` (used for `StatefulComponent` `@Prop()` inference) likewise wraps each inferred prop with `Reactive<>`.
  - `Reactive<T>` is now exported from `@praxisjs/jsx` and `@praxisjs/jsx/jsx-runtime`.

## 0.2.1

### Patch Changes

- @praxisjs/runtime@0.2.1

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
  - @praxisjs/runtime@0.2.0
  - @praxisjs/shared@0.2.0

## 0.1.0

### Minor Changes

- aaf7dab: Initial beta release

### Patch Changes

- Updated dependencies [aaf7dab]
  - @praxisjs/shared@0.1.0
