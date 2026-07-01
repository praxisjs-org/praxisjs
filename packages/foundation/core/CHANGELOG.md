# @praxisjs/core

## 1.8.3

### Patch Changes

- 7d87288: Document `props` as `StatelessComponent`'s intended public API, and as an internal implementation detail on `StatefulComponent` (use `@Prop()` fields instead). No behavior change — `RootComponent.props`, `StatefulComponent.props`, and `StatelessComponent.props` all still return `_rawProps` exactly as before; this only clarifies, via JSDoc, which class each usage pattern is meant for.

## 1.8.2

### Patch Changes

- 376e38c: Internal consolidation: move `_setProps` to `RootComponent` and mark internal fields with `@internal`.

  `_setProps(props)` was implemented identically in both `StatefulComponent` and `StatelessComponent`. It is now defined once on `RootComponent` and removed from the subclasses.

  The following fields on `RootComponent`, `StatefulComponent` are now annotated with `@internal` JSDoc tags and descriptions so they are hidden from TypeDoc output and IDE autocomplete:
  - `RootComponent._rawProps` — props filled by the renderer on instantiation and update
  - `RootComponent._mounted` — becomes `true` after `onMount` fires
  - `RootComponent._anchor` — end-comment node set by the runtime; used by decorators to locate the parent element
  - `StatefulComponent._defaults` — default field values used to reset props on update
  - `StatefulComponent._stateDirty` — set by `@State` on any write; cleared by the renderer after each re-render

  No public API changes.

## 1.8.1

### Patch Changes

- dc031d0: Clean up stale reactive dependencies and keyed resource cache state.

  Effects now unsubscribe from dependencies they no longer read, and computed values drop stale branch subscriptions before recomputing. Signal notifications also iterate over a stable snapshot so subscriber changes during notification do not skip remaining listeners.

  Keyed resources now update the shared cache when `mutate()` is called, and settled in-flight requests are cleared even when the local result became stale after `cancel()`.

## 1.8.0

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
  - @praxisjs/shared@0.3.0

## 1.7.0

### Minor Changes

- 378cc54: `@Resource` now supports shared cache, stale-while-revalidate, deduplication, key-based invalidation, and refetch on focus.

  **New `ResourceOptions`:**
  - `key` — shared cache key; all instances with the same key reuse in-flight requests and read from a single cache entry
  - `staleTime` — ms before cached data is stale; at `0` (default) cached data is shown immediately while fresh data loads in the background (SWR)
  - `refetchOnFocus` — refetches when `document.visibilityState` becomes `"visible"`

  **New `Resource<T>` method:**
  - `destroy()` — stops effects, removes focus listeners, and unregisters from the cache registry; called automatically by `@Resource` on component unmount

  **New export:**
  - `invalidateResource(key)` from `@praxisjs/decorators` — clears the named cache entry and triggers an immediate refetch on every active resource under that key

  **Internal:**
  - `debounced()` — removed a redundant `clearTimeout` call; the effect cleanup already handles it on every re-run
  - `@Memo` `serializeArgs` — removed an unreachable `null` check in the `catch` block (`JSON.stringify(null)` never throws)

## 1.6.0

### Minor Changes

- 74d414a: Rewrite the reactivity engine for clarity and performance.

  **signal()** — subscribers are now stored in a compact `SubList` representation (`null | Effect | Effect[]`) that avoids `Set` allocation for the common zero- and single-subscriber cases. `set`, `update` and `subscribe` are defined as regular closures, making the signal factory straightforward to read and extend.

  **computed()** — the factory now uses a plain closure instead of the previous property-on-function pattern. Downstream computeds (chain propagation) and leaf effects from `.subscribe()` are tracked in separate holders so dirty notification never needs to inspect subscriber types. The `recompute` callback is created lazily — only when the computed is first read inside a reactive context.

  **effect()** — simplified to a standard closure with named `run` and `stop` functions. The `stopped` and `cleanup` state is held naturally in the closure scope.

  **batch()** — uses a pre-allocated, module-level effects array that is reused across batch calls, eliminating one `Set` allocation per `batch()` invocation.

  No breaking changes to the public API (`signal`, `computed`, `effect`, `batch`, `untrack`, `peek`).

## 1.5.0

### Minor Changes

- 9affc5c: Add `syncedSignal` primitive and fix internal dead-code branches.

  `syncedSignal(channelName, initialValue)` creates a signal that stays in sync across browser tabs in real-time via `BroadcastChannel`. Writes in any tab are broadcast to all other open tabs automatically.

  `batch()` — simplified the flush path by replacing the unreachable `batchQueue ?? new Set()` fallback with a direct `if (isOuter && batchQueue)` guard.

  `@praxisjs/composables` — removed no-op class field initializers (`_handler = () => {}`) that were immediately overwritten in `setup()`. Fields are now declared with `!` or typed as optional to reflect their real lifecycle.

## 1.4.1

### Patch Changes

- aaf8a13: Fix `@Watch` (and `@When`, `@OnCommand`) TypeScript error when the decorated method uses typed parameters.

  `createLifecycleMethodDecorator` typed the decorated method value as `(...args: unknown[]) => void`. Because function parameters are checked contravariantly, TypeScript rejected methods with specific parameter types like `WatchVals<this, ...>` or `WatchVal<this, ...>`, producing an "Unable to resolve signature of method decorator" error.

  Changed `unknown[]` to `any[]` to match the existing pattern in `createMethodDecorator`, which accepts any method signature.

  `@Watch` with multiple props now coalesces simultaneous signal changes into a single callback invocation. When two or more watched props change in the same synchronous block, the callback fires once (via `queueMicrotask`) with the final values and the original pre-change values — instead of firing once per changed prop. Signal writes made inside the callback are automatically batched.

  `computed()` subscriber notification is now also coalesced via `queueMicrotask`. When multiple signal dependencies of a computed change in the same synchronous block, its leaf subscribers (DOM effects, `@Watch`, `.subscribe()`) are notified once with the final value. Dirty propagation through chained computeds still happens synchronously, so reads immediately after a signal change always return the correct derived value.

## 1.4.0

### Minor Changes

- 994c581: `StatelessComponent` default type parameter changed from `object` to `Record<never, never>`, making `children` the only implicit prop.

  Components that only receive children no longer need a type argument:

  ```ts
  // before
  class Banner extends StatelessComponent<{ children?: Children }> { … }

  // after
  class Banner extends StatelessComponent { … }
  ```

  Components with additional props declare only those extras — `children` is always available automatically:

  ```ts
  class SidePanel extends StatelessComponent<{ width?: string }> { … }
  // this.props.width and this.props.children are both typed
  ```

## 1.3.0

### Minor Changes

- 5a10864: `StatelessComponent` now exposes an optional typed `children` prop. Accessing `this.props.children` is now valid without declaring `children` in the generic type parameter `T`.

## 1.2.0

### Minor Changes

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

## 1.1.0

### Minor Changes

- 029ef04: `debounced()` now returns a signal with a `.stop()` method to cancel the pending timer and its effect. Synchronous throws inside a `resource` fetcher are now caught and set the resource to error state instead of propagating uncaught.

### Patch Changes

- 029ef04: Fix nested `batch()` calls overwriting the outer queue, and preserve `dirty` flag in computed signals when the compute function throws.
- 029ef04: Isolate subscriber errors during signal updates — all subscribers now run even when one throws, and the last error is re-thrown after all have executed.

## 1.0.0

### Major Changes

- 3372878: Migrate all packages from functional APIs to a decorator-first design.

  **`@praxisjs/core`**
  - Added `Composable` abstract base class for building class-based composables
  - Removed `resource`, `createResource`, `Resource`, `ResourceStatus`, `ResourceOptions` from public exports — use `@Resource` from `@praxisjs/decorators` instead

  **`@praxisjs/motion`**
  - Replaced `useMotion`, `tween`, `spring`, `createTransition`, `Animate`, `easings`, `resolveEasing` with `@Tween` and `@Spring` decorators

  **`@praxisjs/di`**
  - Replaced `useService` and `createScope` with a `@Scope` decorator
  - Renamed exported type `Scope` to `ScopeType` to free the name for the new decorator

  **`@praxisjs/fsm`**
  - Removed `createMachine` — use the `@StateMachine` and `@Transition` decorators directly

  **`@praxisjs/router`**
  - Removed `createRouter`, `lazy`, `useRouter`, `useParams`, `useQuery`, `useLocation`
  - Added `@RouterConfig`, `@Lazy`, `@InjectRouter`, `@Params`, `@Query`, `@Location` decorators

  **`@praxisjs/store`**
  - Removed `createStore` — use the `@Store` and `@UseStore` decorators directly

  **`@praxisjs/composables`**
  - Replaced all `use*` composable functions with class-based composables extending `Composable`:
    `WindowSize`, `ScrollPosition`, `ElementSize`, `Intersection`, `Focus`, `MediaQuery`, `ColorScheme`, `Mouse`, `KeyCombo`, `Idle`, `Clipboard`, `Geolocation`, `TimeAgo`, `Pagination`

  **`@praxisjs/concurrent`**
  - Removed `task`, `queue`, `pool` and their instance types — use `@Task`, `@Queue`, `@Pool` decorators instead

## 0.4.2

### Patch Changes

- d11a10a: Fix `effect()` stop function not preventing re-runs

  The function returned by `effect()` was only calling the cleanup callback but leaving the effect subscribed to all tracked signals, so it would keep re-running after being stopped. The stop function now sets a `stopped` flag that makes future invocations of the wrapped effect a no-op, and nullifies the cleanup reference to ensure idempotent behaviour.

  This also fixes `$subscribe` unsubscription in `@praxisjs/store`, which relied on this mechanism to detach listeners.

## 0.4.1

### Patch Changes

- fe39901: fix(core): fix effect subscription leak in `when()` when source is immediately truthy

  When `source()` returned a truthy value on the first synchronous effect run, `stop` was still `undefined` at that point. The `stop?.()` call inside the callback was a no-op, leaving the effect subscribed forever — any future change to the source kept triggering the effect (which returned early via `disposed`, but still maintained its reactive tracking).

  The implementation was refactored to use a `ref` object (`{ cancel }`) to hold the cancellation function. This allows `stop` to be declared as `const`, removes the optional chain on a non-nullable type, and ensures the effect is properly cancelled via `if (disposed) stop()` after the first synchronous run.

## 0.4.0

### Minor Changes

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

### Patch Changes

- Updated dependencies [bb0d4f8]
  - @praxisjs/shared@0.2.0

## 0.2.0

### Minor Changes

- f48dbc4: Introduce WithHistory<T, K> utility type for better TypeScript inference when using the @History decorator, and fix performance issues in the history() primitive.

  Changes:

  @praxisjs/decorators: Added WithHistory<T, K> type that maps a property key to its corresponding \*History accessor type, enabling proper type-checking on decorated classes.
  @praxisjs/decorators: Simplified @History decorator internals — replaced verbose getOwnPropertyDescriptor lookups with direct property access (this[propertyKey]), reducing complexity.
  @praxisjs/core: Fixed history() to use peek() when reading \_past and \_current inside the tracking effect, preventing unnecessary re-runs caused by reactive reads during history recording.
  @praxisjs/core: Added an \_initialized guard so the first value is captured without pushing an empty entry into the past stack.

## 0.1.0

### Minor Changes

- aaf7dab: Initial beta release

### Patch Changes

- Updated dependencies [aaf7dab]
  - @praxisjs/jsx@0.1.0
  - @praxisjs/shared@0.1.0
