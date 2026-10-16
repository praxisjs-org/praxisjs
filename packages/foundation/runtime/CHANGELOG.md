# @praxisjs/runtime

## 0.8.1

### Patch Changes

- d634a29: Write boolean `aria-*` attributes as `"true"` and `"false"` instead of an empty attribute (or none for `false`), which assistive technology reads as an unset state. Compiled templates emit the same markup. `data-*` and HTML boolean attributes are unchanged.

## 0.8.0

### Minor Changes

- 75115a9: Component hot module replacement. In the dev server, `@praxisjs/vite-plugin` registers each top-level class of the app's modules with `@praxisjs/runtime` (`_$hmrRegister`), and a module whose exports are all component classes accepts its own update: every mounted instance of an edited component renders again in place with the new class, without a page reload. Modules that export anything else keep Vite's default handling.
- 75115a9: Fix fragments dropping function children: `<>{() => x}</>` now mounts a reactive region, like element children. `@praxisjs/runtime` exports `mountChildren`, which `@praxisjs/jsx` uses to mount fragment children.
- 75115a9: Add keyed list reconciliation. `For` (keyed by `by`, or by item identity) and `Index` (by position) in `@praxisjs/runtime` render each key once, keep its row while the key stays, and create, move or remove only the rows that changed, with the minimum number of moves (LIS) and `moveBefore()` where available. They support fallbacks, Promise-based enter/leave transitions, hydration of prerendered rows, and isolate row render errors. `@praxisjs/jsx` types components that set `static __jsxRawProps = true` by their exact constructor props, so `For` infers its item type. `@praxisjs/vite-plugin` rewrites keyed `{() => list.map((item) => <Row key={…} />)}` children into `For` and warns about keyed `.map()` calls it cannot rewrite (`keyedLists` option).
- 75115a9: Rendering and reactivity performance overhaul. `@praxisjs/core` has a new push-pull reactive graph (linked dependencies reused across runs, version-checked computeds, glitch-free effects) and keeps component internals on the instance. `@praxisjs/decorators` shares one accessor pair per `@State`/`@Prop` field, creates `@Computed` lazily, and `@Component` no longer wraps the class. `@praxisjs/runtime` adds the compiled-template helpers, a shared event dispatcher, leaner scopes and reactive children, skipped no-op prop writes, cheaper component mounting and a detached fill for large `For` renders, and fixes a static `<select>` value being lost. `@praxisjs/vite-plugin` compiles JSX trees of host elements into templates cloned per render (`templates` option, on by default).
- 75115a9: Smaller startup: `render()` hydrates only after the new `enableHydration()` (called by `ssgPlugin()`), so apps that don't prerender leave the hydration code out. **Breaking:** an app that hydrates server-rendered HTML without `ssgPlugin()` must call `enableHydration()` before `render()`. Also, compiled templates whose tree the HTML parser reads back unchanged are emitted as markup and parsed once (`_$html`); decorated fields, methods and classes call shorter lowering helpers; the list view's internal members are `#private`.

### Patch Changes

- 75115a9: DevTools: a Performance panel and `profiler` that record signal writes, effect runs and computed recomputations with their cost, grouped by the component that created each effect; `@Debug({ log, break })`, reactive observation of accessor fields (props included), promise-aware method timing, `@Trace({ slow })`, inert decorators in production builds, and a faster registry. Core exposes the observer hooks the profiler uses (`setReactiveObserver`, `setCurrentOwner`, `getEffectOwner` in `@praxisjs/core/internal`), which cost one null check while no observer is installed; the runtime marks the rendering component as the owner of the effects it creates.
- 75115a9: Edge-case fixes in the new fast paths. `@praxisjs/vite-plugin` keeps a claimed field's initializer in the field's own scope instead of moving it into the constructor, where a constructor parameter or local of the same name shadowed what it read (and `new.target` fields are claimed too). `selector()` from `@praxisjs/core` compares against the current source value when read outside an effect, also inside a batch or an event handler before its subscribers are notified. `@praxisjs/runtime` keeps updating a hydrated element through a reactive child that fills it alone, rebuilds compiled templates when `render()` runs with another global document (a new SSG window), and always writes `open`, `selectedIndex`, media and scroll props from reactive bindings so a re-run restores what the user changed. Compiled templates keep the leading whitespace of JSX text (`{v} / {m}` lost its first space) and keep tabs inside a line, as the JSX transform does. Methods of `@Bind`, `@Emit` and the other built-in method decorators can be spied on with `vi.spyOn(instance, name)` before their first read again. `@praxisjs/router`'s `Link` removes its `class` attribute when it stops being active instead of leaving `class=""`.
- 75115a9: Published packages no longer contain their tests: package builds compile `src` without `src/**/__tests__` (through a `tsconfig.build.json`), and each package's `files` leaves test sources and stale compiled tests out of the tarball. `pnpm typecheck` still type-checks the tests.
- 75115a9: Cheaper creation of rows and components. `@praxisjs/runtime` builds and clones compiled templates in the inert `<template>` document (live document for templates with custom elements) and no longer touches `document` at import time, binds template event props without a listener (one capture listener per event type on the document and on each render container attaches an element's own listener on first use, same dispatch semantics), runs reactive props and children through shared functions with per-binding records instead of closures, creates text natively without JS wrappers, forks a reactive child's scope only when a run asks for it, stops wrapping single-root components in comments, writes only-child text with `textContent` and inserts arrays without a fragment. Compiled event props bind through a per-module target (`_$event`/`_$onEvent`) and reactive `class` props through `_$className`, skipping the generic prop dispatch. `@praxisjs/core`'s `getComponentAnchor()` returns a `Node` (a single-root component is anchored on its root) and every `selector()` shares one bucket class, `createContextEffect()` runs an effect whose shared function reads its state from `this.ctx`; effects record their owner even when no reactive observer is installed (`getEffectOwner()` reads it from the node). `@praxisjs/vite-plugin` also compiles lone elements that have something static or a reactive child, emits the delegated event bindings, emits a template that is an arrow function's whole body or a `return` operand as plain statements, leaves no placeholder for a reactive only child, hoists one event target per event prop name and module, emits a dedicated binding for a reactive `class`/`className`, and no longer wraps a JSX tree used as an attribute value of a compiled element in braces. Both packages keep one inert instance of each hot internal class (graph nodes and links, selector buckets, scopes, list rows, reactive children) so their V8 hidden classes survive a full GC after a list is cleared, and every list row gets the same hidden class whatever it renders.
- 75115a9: Update reactive text in place. A reactive child that returns a string or number rewrites its existing text node, and skips the write when the text is unchanged, instead of replacing the node on every re-run.
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

## 0.7.1

### Patch Changes

- 7720b22: Fix the 0.7.0 regression where an event prop set to `undefined` or `null` threw `Invalid value used as weak map key` and left the component empty. Missing handlers (and `ref`) are ignored; `EventListenerObject` handlers are registered unbatched.

## 0.7.0

### Minor Changes

- 073e76a: JSX event handlers now run inside `batch()`, so multiple state writes in one handler re-run dependent effects once. Also: a single shared microtask drains all `onMount` hooks of a mount pass, the writable-property lookup used for JSX props is cached per prototype, `Portal` attaches its subtree in one operation, and `ref` callbacks run untracked.

  Replacing or removing a multi-node reactive child (and `Portal` cleanup) now walks the sibling nodes instead of allocating a `Range` per update, which is several times faster (rebuilding a 500-row list: ~3.2 ms → ~0.2 ms in a browser benchmark).

### Patch Changes

- Updated dependencies [a97a37c]
- Updated dependencies [c7a5950]
  - @praxisjs/core@2.2.0
  - @praxisjs/decorators@1.7.0

## 0.6.0

### Minor Changes

- 728c90e: `render()` now hydrates prerendered HTML instead of discarding it, when the container carries the marker `@praxisjs/ssg` writes onto its static output.

  The tree is still built the normal way (same `mountElement`/`mountComponent`/`mountReactive` code path, unchanged for every existing app), just into a detached node first. A new reconciliation pass then walks that fresh tree against the container's existing DOM: matching elements keep the real, already-attached node (with props and listeners replayed onto it) instead of being recreated, while text/comment nodes and any local mismatch are recreated as before. `Portal` is skipped during a server render pass (`isServerRenderPass()` from `@praxisjs/core/internal`) so its content is never baked into static HTML, avoiding duplication once it mounts normally on the client.

  Apps that never render server-provided HTML are unaffected — `render()`'s create-mode path is unchanged.

### Patch Changes

- Updated dependencies [1ec5b2f]
  - @praxisjs/core@2.1.0
  - @praxisjs/decorators@1.6.1

## 0.5.5

### Patch Changes

- Updated dependencies [b24f603]
  - @praxisjs/decorators@1.6.0

## 0.5.4

### Patch Changes

- Updated dependencies [f1b7ee7]
  - @praxisjs/decorators@1.5.1

## 0.5.3

### Patch Changes

- 8ab6426: Move component runtime state out of public instances and behind internal helpers.

  BREAKING CHANGE: `RootComponent`, `StatefulComponent`, and `ReactiveStore` no longer expose framework-only underscore internals or `StatefulComponent.props` as public instance API.

  `RootComponent` and `StatefulComponent` no longer expose framework-only underscore fields such as `_rawProps`, `_mounted`, `_anchor`, `_setProps`, `_defaults`, or `_stateDirty`. The renderer, decorators, JSX types, and first-party CSS utilities now use helpers from `@praxisjs/core/internal` to access that state.

  For app code, `StatefulComponent` props should continue to be modeled with `@Prop()` fields. `StatelessComponent<T>` keeps its public `props` getter.

  This also clarifies the intended props API: `StatelessComponent.props` is public, while `StatefulComponent` subclasses should read parent-provided values through `@Prop()` fields instead of `props`.

  `ReactiveStore` now uses a type-only reactive-host marker for `@State`/`@DeepState` compatibility and no longer creates `_stateDirty` on store instances.

- Updated dependencies [55e645d]
- Updated dependencies [8ab6426]
  - @praxisjs/decorators@1.5.0
  - @praxisjs/core@2.0.0
  - @praxisjs/shared@0.3.1

## 0.5.2

### Patch Changes

- Updated dependencies [7d87288]
  - @praxisjs/core@1.8.3
  - @praxisjs/decorators@1.4.1

## 0.5.1

### Patch Changes

- 98076e7: `VALUE_PROPS` replaced with runtime feature detection.

  Instead of a hardcoded list of prop names, the runtime now checks whether a prop resolves to a real, assignable property (a setter, or a writable data property) on the element's prototype chain, and writes it there automatically instead of as an attribute. Any current or future DOM property with this quirk (e.g. `checked`, `value`, `selected`, `innerHTML`) is now covered with no list to maintain. Read-only accessors — SVG geometry (`width`, `cx`, `r`…) and reference/collection getters like `list`, `form`, `part`, `classList` — are detected and correctly fall back to `setAttribute` instead of throwing.

## 0.5.0

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

- Updated dependencies [bcaad96]
- Updated dependencies [376e38c]
  - @praxisjs/decorators@1.4.0
  - @praxisjs/core@1.8.2

## 0.4.1

### Patch Changes

- dc031d0: Fix fragment primitive children and improve runtime cleanup.

  `@praxisjs/jsx` now preserves primitive fragment children like strings and `0` by converting them to text nodes.

  `@praxisjs/runtime` now skips the queued `onMount` and `ref(instance)` callbacks if a component is disposed before the mount microtask runs.

  Reactive child scopes no longer register a new parent cleanup on every update, and portal cleanup now tolerates anchors that were removed externally before disposal.

- Updated dependencies [dc031d0]
  - @praxisjs/core@1.8.1
  - @praxisjs/decorators@1.3.1

## 0.4.0

### Minor Changes

- 80442e0: Add writable computed: `@Computed({ set })`, `@Computed({ get, set })` on `accessor` fields, and `writableComputed()`.

  `@Computed` now accepts an optional `set` function. Assigning to the decorated property calls the setter with the component instance as `this`, letting you write back to the underlying signals while keeping the getter as a reactive cached `computed()`.

  For full TypeScript compatibility without a cast, pass both `get` and `set` to the decorator and declare the field with the `accessor` keyword — TypeScript treats `accessor` fields as read-write.

  `writableComputed(getter, setter)` is also available from `@praxisjs/core/internal` for use in `Composable` patterns that don't use decorators. The `WritableComputed<T>` type is exported from `@praxisjs/shared`.

  ***

  `onError` can now return `Node | Node[] | null` to mount fallback DOM.

  Previously `onError` was `void`-only — it could log or update state, but couldn't directly control what rendered when a component failed.

  `onError(error: Error): Node | Node[] | null | undefined` — if a node or array is returned, the runtime mounts it in place of the failed render output. Return `null` or `undefined` to render nothing (preserves existing behavior).

  ```tsx
  @Component()
  class SafeCard extends StatefulComponent {
    onError(err: Error) {
      return <p class="error-fallback">Failed to load: {err.message}</p>;
    }

    render() {
      return <Card data={this.data} />;
    }
  }
  ```

### Patch Changes

- Updated dependencies [80442e0]
  - @praxisjs/decorators@1.3.0
  - @praxisjs/core@1.8.0
  - @praxisjs/shared@0.3.0

## 0.3.2

### Patch Changes

- Updated dependencies [3fb2309]
  - @praxisjs/decorators@1.2.0

## 0.3.1

### Patch Changes

- Updated dependencies [a0372af]
  - @praxisjs/decorators@1.1.1

## 0.3.0

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

- 1a0631b: New: `Portal` — renders a JSX subtree into a target DOM node outside the component's natural parent. Exports `Portal` class and `PortalProps` interface from `@praxisjs/runtime`. Integrates with the scope system for automatic cleanup on unmount.

  Internal: `resolvePortalTarget` is now an exported named function (previously file-private). The function is not re-exported from the package index and remains an implementation detail.

- Updated dependencies [378cc54]
  - @praxisjs/core@1.7.0
  - @praxisjs/decorators@1.1.0

## 0.2.18

### Patch Changes

- b9411cb: `innerHTML` prop support and JSX type fixes.
  - `@praxisjs/runtime` — `innerHTML` now correctly assigns `element.innerHTML` (DOM property) instead of calling `setAttribute`. Supports reactive values: `innerHTML={() => this.html}`.
  - `@praxisjs/jsx` — `innerHTML?: Reactive<string>` added to `HTMLAttributes`. `LibraryManagedAttributes` now includes `children?: Children` for all component types, so components using `@Slot` or receiving JSX children no longer produce a TypeScript error at the call site.

- Updated dependencies [cfb0de2]
  - @praxisjs/decorators@1.0.2

## 0.2.17

### Patch Changes

- 9aeec6a: Optimize DOM patching in the runtime for lower allocation and fewer reflows.

  **element.ts** — prop iteration now uses `for...in` instead of `Object.entries()`, avoiding the intermediate key-value array allocation per element mount.

  **reactive.ts** — `normalizeToNodes` (returned a new array on every call) is replaced by `collectNodes` (accumulates into a caller-supplied array), removing one allocation per reactive update. Node insertion is batched through `nodesToFragment`: when multiple nodes are produced, they are appended to a `DocumentFragment` and inserted in a single `insertBefore` call. Bulk removal of existing nodes uses `Range.deleteContents()` instead of individual `removeChild` calls, reducing the number of reflow-triggering operations to one.

  No changes to the public API.

- Updated dependencies [74d414a]
  - @praxisjs/core@1.6.0
  - @praxisjs/decorators@1.0.1

## 0.2.16

### Patch Changes

- bb4d00a: Fix `mountReactive` silently dropping DOM updates when the reactive node lives inside a component.

  `mountReactive` captured `parent` (the container passed by `mountComponent`, a `DocumentFragment`) by closure. After `mountComponent` returns, the fragment's child nodes are transferred to the actual DOM element — leaving the fragment empty. When a signal change triggered the reactive effect to re-run, `parent.insertBefore(n, end)` failed silently because `end` was no longer a child of the stale `parent` reference.

  The fix uses `end.parentNode ?? parent` as the insertion anchor, which always resolves to the live DOM parent after the fragment has been consumed. This affects any reactive expression (`{() => ...}`) returned from a component's `render()` method, including `@Lazy`, `@StateMachine` state-dependent renders, and the `onError` pattern from the docs.

- Updated dependencies [954e456]
- Updated dependencies [a0bf339]
- Updated dependencies [a0bf339]
- Updated dependencies [a8df1e1]
  - @praxisjs/decorators@1.0.0

## 0.2.15

### Patch Changes

- Updated dependencies [9c7a165]
  - @praxisjs/decorators@0.8.1

## 0.2.14

### Patch Changes

- Updated dependencies [9affc5c]
- Updated dependencies [2f08576]
  - @praxisjs/core@1.5.0
  - @praxisjs/decorators@0.8.0

## 0.2.13

### Patch Changes

- Updated dependencies [aaf8a13]
  - @praxisjs/core@1.4.1
  - @praxisjs/decorators@0.7.5

## 0.2.12

### Patch Changes

- Updated dependencies [994c581]
  - @praxisjs/core@1.4.0
  - @praxisjs/decorators@0.7.4

## 0.2.11

### Patch Changes

- Updated dependencies [5a10864]
  - @praxisjs/core@1.3.0
  - @praxisjs/decorators@0.7.3

## 0.2.10

### Patch Changes

- Updated dependencies [2c61a25]
  - @praxisjs/decorators@0.7.2

## 0.2.9

### Patch Changes

- 6c353ba: Add `untrack` utility and isolate component mounting from outer reactive contexts

  **`@praxisjs/core`** exports two new functions from the public API:
  - `peek(signal)` — reads a signal once without subscribing to it (was already in `/internal`, now public)
  - `untrack(fn)` — runs a function with no active effect, suppressing all signal tracking inside it

  ```ts
  import { peek, untrack } from "@praxisjs/core";

  // read a signal without creating a dependency
  if (peek(this.max) > peek(this.count)) {
    this.count++;
  }

  // suppress tracking for a block of reads
  const snapshot = untrack(() => this.totalCost);
  ```

  **`@praxisjs/runtime`** — `mountComponent` now runs entirely inside `untrack`. This fixes a bug where components mounted inside a reactive context (e.g. the router) would accidentally subscribe the outer effect to any signal read during construction or render. The symptoms were:
  - Eager reads like `description={this.count}` in JSX causing the router to re-mount the component on every state change, resetting state to its initial value
  - `@Debug()` (and any decorator that reads a signal in its `addInitializer`) triggering the same re-mount loop

  Reactive subscriptions set up via `{() => signal}` in JSX are unaffected — each arrow function creates its own isolated effect.

- Updated dependencies [6c353ba]
  - @praxisjs/core@1.2.0
  - @praxisjs/decorators@0.7.1

## 0.2.8

### Patch Changes

- Updated dependencies [2b8c768]
  - @praxisjs/decorators@0.7.0

## 0.2.7

### Patch Changes

- Updated dependencies [72cd9a8]
  - @praxisjs/decorators@0.6.1

## 0.2.6

### Patch Changes

- 029ef04: CSS custom properties (keys starting with `--`) are now applied via `setProperty()` so they work correctly in style objects. Scope cleanup functions no longer halt on the first error — all cleanups run and errors are collected into an `AggregateError`.
- Updated dependencies [029ef04]
- Updated dependencies [029ef04]
- Updated dependencies [029ef04]
- Updated dependencies [029ef04]
- Updated dependencies [029ef04]
  - @praxisjs/core@1.1.0
  - @praxisjs/decorators@0.6.0

## 0.2.5

### Patch Changes

- Updated dependencies [3372878]
- Updated dependencies [feaa478]
  - @praxisjs/core@1.0.0
  - @praxisjs/decorators@0.5.0

## 0.2.4

### Patch Changes

- Updated dependencies [ea59035]
- Updated dependencies [d11a10a]
  - @praxisjs/decorators@0.4.3
  - @praxisjs/core@0.4.2

## 0.2.3

### Patch Changes

- Updated dependencies [fe39901]
- Updated dependencies [fe39901]
  - @praxisjs/decorators@0.4.2
  - @praxisjs/core@0.4.1

## 0.2.2

### Patch Changes

- Updated dependencies [966efdc]
  - @praxisjs/decorators@0.4.1

## 0.2.1

### Patch Changes

- Updated dependencies [f52354d]
  - @praxisjs/decorators@0.4.0
  - @praxisjs/core@0.4.0

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
  - @praxisjs/core@0.3.0
  - @praxisjs/shared@0.2.0

## 0.1.1

### Patch Changes

- Updated dependencies [f48dbc4]
  - @praxisjs/core@0.2.0
  - @praxisjs/decorators@0.2.0

## 0.1.0

### Minor Changes

- aaf7dab: Initial beta release

### Patch Changes

- Updated dependencies [aaf7dab]
  - @praxisjs/core@0.1.0
  - @praxisjs/decorators@0.1.0
  - @praxisjs/jsx@0.1.0
  - @praxisjs/shared@0.1.0
