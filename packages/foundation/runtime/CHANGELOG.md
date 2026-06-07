# @praxisjs/runtime

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
