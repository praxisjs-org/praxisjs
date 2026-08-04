# @praxisjs/jsx

## 0.7.5

### Patch Changes

- Updated dependencies [1ec5b2f]
- Updated dependencies [728c90e]
  - @praxisjs/core@2.1.0
  - @praxisjs/runtime@0.6.0

## 0.7.4

### Patch Changes

- @praxisjs/runtime@0.5.5

## 0.7.3

### Patch Changes

- @praxisjs/runtime@0.5.4

## 0.7.2

### Patch Changes

- 8ab6426: Move component runtime state out of public instances and behind internal helpers.

  BREAKING CHANGE: `RootComponent`, `StatefulComponent`, and `ReactiveStore` no longer expose framework-only underscore internals or `StatefulComponent.props` as public instance API.

  `RootComponent` and `StatefulComponent` no longer expose framework-only underscore fields such as `_rawProps`, `_mounted`, `_anchor`, `_setProps`, `_defaults`, or `_stateDirty`. The renderer, decorators, JSX types, and first-party CSS utilities now use helpers from `@praxisjs/core/internal` to access that state.

  For app code, `StatefulComponent` props should continue to be modeled with `@Prop()` fields. `StatelessComponent<T>` keeps its public `props` getter.

  This also clarifies the intended props API: `StatelessComponent.props` is public, while `StatefulComponent` subclasses should read parent-provided values through `@Prop()` fields instead of `props`.

  `ReactiveStore` now uses a type-only reactive-host marker for `@State`/`@DeepState` compatibility and no longer creates `_stateDirty` on store instances.

- Updated dependencies [8ab6426]
  - @praxisjs/core@2.0.0
  - @praxisjs/shared@0.3.1
  - @praxisjs/runtime@0.5.3

## 0.7.1

### Patch Changes

- @praxisjs/runtime@0.5.2

## 0.7.0

### Minor Changes

- 92d8213: `Reactive<T>` now accepts `null`/`undefined`, both as a static value and as what the reactive function returns (`Reactive<T> = T | null | undefined | (() => T | null | undefined)`). This lets any JSX attribute be conditionally omitted or cleared — the runtime already removes the attribute when a prop resolves to `null`/`undefined` — without a type-cast at the call site.

### Patch Changes

- Updated dependencies [98076e7]
  - @praxisjs/runtime@0.5.1

## 0.6.1

### Patch Changes

- b36b1fd: Audit every attribute in `dom-types.ts` for `Reactive<T>` coverage. The runtime has always accepted a zero-argument function for any JSX attribute, but many attributes (all 30 previously-static `aria-*` attributes, `role`, global attributes like `slot`/`accessKey`/`popover`, and dozens of per-element attributes across `AnchorHTMLAttributes`, `InputHTMLAttributes`, `TableHTMLAttributes`, etc.) weren't typed as `Reactive<T>`, so passing a function for them was a type error even though it worked at runtime. This also fixes several same-attribute inconsistencies between interfaces (e.g. `href`/`target`/`value`/`max`/`src`/`width`/`height`/`dateTime` were reactive in some elements but not others). Attributes that are genuinely one-shot or static by browser spec (`autoFocus`, `autoPlay`, `defaultValue`, `defaultChecked`, `is`, `nonce`, `xmlns`) are intentionally left as-is.

## 0.6.0

### Minor Changes

- 4060b4f: Expand DOM event coverage and HTML/SVG attribute types.

  **`@praxisjs/runtime` — EVENT_MAP expanded from 24 to 82 entries.**

  Bug fix: `onToggle`, `onClose`, and `onCancel` were declared in their respective JSX interfaces but absent from `EVENT_MAP`. The runtime was treating them as reactive getters instead of event listeners. They are now wired correctly.

  New event categories added to `EVENT_MAP`:
  - **Pointer** — `onPointerDown`, `onPointerUp`, `onPointerMove`, `onPointerEnter`, `onPointerLeave`, `onPointerOver`, `onPointerOut`, `onPointerCancel`, `onGotPointerCapture`, `onLostPointerCapture`
  - **Mouse** — `onMouseOver`, `onMouseOut` (bubbling variants)
  - **Drag** — `onDrag`, `onDragEnter`, `onDragLeave`
  - **Form** — `onBeforeInput`, `onSelect`, `onInvalid`
  - **Clipboard** — `onCopy`, `onCut`, `onPaste`
  - **Composition (IME)** — `onCompositionStart`, `onCompositionUpdate`, `onCompositionEnd`
  - **Resource** — `onLoad`, `onError`
  - **Scroll** — `onScrollEnd`
  - **Element-specific** — `onBeforeToggle`
  - **Media** — `onAbort`, `onCanPlay`, `onCanPlayThrough`, `onDurationChange`, `onEmptied`, `onEnded`, `onLoadedData`, `onLoadedMetadata`, `onLoadStart`, `onPause`, `onPlay`, `onPlaying`, `onProgress`, `onRateChange`, `onSeeked`, `onSeeking`, `onStalled`, `onSuspend`, `onTimeUpdate`, `onVolumeChange`, `onWaiting`

  **`@praxisjs/jsx` — type additions.**

  `AriaAttributes`:
  - `"aria-expanded"` — was missing entirely; it is one of the most commonly used ARIA attributes (accordions, disclosures, dropdowns)
  - `"aria-autocomplete"` — for combobox/searchbox widgets
  - `"aria-errormessage"` — references the element that provides the validation error message

  `DOMAttributes<T>`: all new event categories above are now typed with their correct native event types (`PointerEvent`, `ClipboardEvent`, `CompositionEvent`, `ProgressEvent`, etc.) and `currentTarget` narrowed to `T`.

  `HTMLAttributes<T>`:
  - `autoFocus` — `autofocus` is a global HTML5 attribute, not only valid on form controls
  - `inert` — `Reactive<boolean>`; blocks all user interaction and assistive technology programmatically
  - `popover` — Popover API; accepts `boolean` (empty attribute, defaults to `"auto"`) or `"auto"` / `"manual"`
  - `accessKey` — keyboard shortcut hint
  - `nonce` — CSP nonce passthrough
  - `part` — CSS `::part()` export list for shadow DOM styling
  - `data-*` — template-literal index signature `[key: \`data-${string}\`]: Reactive<string | number | boolean> | undefined`; data attributes are now accepted without a cast on any JSX element

  `MediaHTMLAttributes<T>`: all 21 standard media events typed and wired.

  `DetailsHTMLAttributes` / `DialogHTMLAttributes`: `onBeforeToggle` added to both.

  `InputHTMLAttributes`: `popovertarget` and `popovertargetaction` added (consistent with `ButtonHTMLAttributes`).

  `SVGAttributes<T>`:
  - `pointerEvents` — typed with all valid SVG `pointer-events` keyword values
  - `vectorEffect`, `shapeRendering`, `textRendering`, `imageRendering`, `colorInterpolation`, `paintOrder` — rendering hints
  - `cursor` — cursor override on SVG elements

### Patch Changes

- Updated dependencies [4060b4f]
  - @praxisjs/runtime@0.5.0

## 0.5.4

### Patch Changes

- dc031d0: Fix fragment primitive children and improve runtime cleanup.

  `@praxisjs/jsx` now preserves primitive fragment children like strings and `0` by converting them to text nodes.

  `@praxisjs/runtime` now skips the queued `onMount` and `ref(instance)` callbacks if a component is disposed before the mount microtask runs.

  Reactive child scopes no longer register a new parent cleanup on every update, and portal cleanup now tolerates anchors that were removed externally before disposal.

- Updated dependencies [dc031d0]
  - @praxisjs/runtime@0.4.1

## 0.5.3

### Patch Changes

- Updated dependencies [80442e0]
  - @praxisjs/shared@0.3.0
  - @praxisjs/runtime@0.4.0

## 0.5.2

### Patch Changes

- @praxisjs/runtime@0.3.2

## 0.5.1

### Patch Changes

- @praxisjs/runtime@0.3.1

## 0.5.0

### Minor Changes

- 41eb531: Add `ref` prop support for component JSX tags.

  `ref` receives the component instance after `onMount` fires, and `null` after `onUnmount`. It is not forwarded to the component's own props.

  ```tsx
  @Component()
  class Modal extends StatefulComponent { … }

  // ref is typed as (instance: Modal | null) => void
  <Modal ref={(inst) => { this.modal = inst }} />
  ```

### Patch Changes

- Updated dependencies [41eb531]
- Updated dependencies [1a0631b]
  - @praxisjs/runtime@0.3.0

## 0.4.6

### Patch Changes

- b9411cb: `innerHTML` prop support and JSX type fixes.
  - `@praxisjs/runtime` — `innerHTML` now correctly assigns `element.innerHTML` (DOM property) instead of calling `setAttribute`. Supports reactive values: `innerHTML={() => this.html}`.
  - `@praxisjs/jsx` — `innerHTML?: Reactive<string>` added to `HTMLAttributes`. `LibraryManagedAttributes` now includes `children?: Children` for all component types, so components using `@Slot` or receiving JSX children no longer produce a TypeScript error at the call site.

- Updated dependencies [b9411cb]
  - @praxisjs/runtime@0.2.18

## 0.4.5

### Patch Changes

- Updated dependencies [9aeec6a]
  - @praxisjs/runtime@0.2.17

## 0.4.4

### Patch Changes

- Updated dependencies [bb4d00a]
  - @praxisjs/runtime@0.2.16

## 0.4.3

### Patch Changes

- @praxisjs/runtime@0.2.15

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
