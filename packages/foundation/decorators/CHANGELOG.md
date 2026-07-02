# @praxisjs/decorators

## 1.5.1

### Patch Changes

- f1b7ee7: `@FunctionProp()` now logs a `console.warn` in development when the received value isn't a function, instead of silently accepting it.

## 1.5.0

### Minor Changes

- 55e645d: Add `@FunctionProp()` for function-valued props that should be received without invoking them as reactive getters.

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

## 1.4.1

### Patch Changes

- Updated dependencies [7d87288]
  - @praxisjs/core@1.8.3

## 1.4.0

### Minor Changes

- bcaad96: Add `@Ref<T>()` decorator, `createRef<T>()` helper, and `Ref<T>` type for typed DOM element refs.

  Replaces the manual `{ current: null as T | null }` field with a decorator that produces a callable ref — pass it directly to the JSX `ref` prop and read `.current` to access the element. Works transparently with `@Compose` via the existing string-name resolution. Use `createRef<T>()` for module-level refs outside of classes.

### Patch Changes

- Updated dependencies [376e38c]
  - @praxisjs/core@1.8.2

## 1.3.1

### Patch Changes

- Updated dependencies [dc031d0]
  - @praxisjs/core@1.8.1

## 1.3.0

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
  - @praxisjs/core@1.8.0
  - @praxisjs/shared@0.3.0

## 1.2.0

### Minor Changes

- 3fb2309: `@When` now accepts an optional condition function.

  ```ts
  // fires the first time score reaches 100
  @When('score', score => score >= 100)
  onWin() { ... }
  ```

  Pass a predicate as the second argument to `@When(propName, condition?)`. The method fires exactly once — on the first value for which `condition(value)` returns `true`. Without a condition, the existing behaviour is unchanged: the method fires on the first truthy value.

  **Internal fix**: `@When` now reads the property inside a reactive `effect()` (the same approach as `@Watch`), so it works correctly with `@State`-decorated fields in addition to raw `Signal`/`Computed` properties.

## 1.1.1

### Patch Changes

- a0372af: Internal test coverage improvements — branch, statement, function, and line coverage raised to 100% across all decorators. No public API changes.

## 1.1.0

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

### Patch Changes

- Updated dependencies [378cc54]
  - @praxisjs/core@1.7.0

## 1.0.2

### Patch Changes

- cfb0de2: `@Resource` now accepts a self-receiving fetcher as an alternative to the zero-argument arrow function.

  When the fetcher accepts one argument, the component instance is passed automatically at bind time — signal reads on `self` become reactive dependencies and TypeScript knows the type:

  ```tsx
  // before — arrow function, 'this' was module scope (undefined)
  @Resource(() => fetch(`/api/posts?page=${this.page}`).then(r => r.json()))

  // after — receive the instance as 'self'
  @Resource((self: PostList) => fetch(`/api/posts?page=${self.page}`).then(r => r.json()))
  posts!: ResourceInstance<Post[]>
  ```

  The zero-argument form is unchanged and continues to work for fetchers with no component dependency.

## 1.0.1

### Patch Changes

- Updated dependencies [74d414a]
  - @praxisjs/core@1.6.0

## 1.0.0

### Major Changes

- a8df1e1: **Breaking:** Remove `@Virtual` class decorator.

  `@Virtual` had two fundamental issues that made it unsuitable as a class decorator:
  1. **Items were read as a snapshot** — the `items` prop was captured at render time and never updated when the source changed (filtering, live data, external state).
  2. **JSX in `renderItem` broke on scroll** — `renderItem` callbacks that used JSX called `getCurrentScope()` inside a plain `effect()` re-run, outside any render scope, causing silent failures.

  **Migration:** use `VirtualList` from `@praxisjs/composables` instead. It exposes reactive signals (`visibleItems`, `totalHeight`, `offsetTop`, `offsetBottom`) that the component renders with normal JSX — no `renderItem` convention, full reactivity, and full JSX support.

  ```tsx
  // before
  @Virtual(48, 5)
  @Component()
  class MyList extends StatefulComponent {
    @Prop() items: Row[] = [];
    renderItem(row: Row) {
      return <div style="height:48px">{row.name}</div>;
    }
    render() {
      return <div />;
    }
  }

  // after
  import { VirtualList, type VirtualItem } from "@praxisjs/composables";
  import { getter } from "@praxisjs/decorators";

  @Component()
  class MyList extends StatefulComponent {
    @Prop() items: Row[] = [];
    containerRef = { current: null as HTMLDivElement | null };

    @Compose(VirtualList, "containerRef", getter("items"), 48, 5)
    virtual!: VirtualList<Row>;

    render() {
      return (
        <div
          ref={(el) => {
            this.containerRef.current = el;
          }}
          style="height:400px;overflow-y:auto"
        >
          <div
            style={() =>
              `height:${this.virtual.totalHeight}px;position:relative`
            }
          >
            <div style={() => `height:${this.virtual.offsetTop}px`} />
            {() =>
              (this.virtual.visibleItems as VirtualItem<Row>[]).map(
                ({ item }) => <div style="height:48px">{item.name}</div>,
              )
            }
            <div style={() => `height:${this.virtual.offsetBottom}px`} />
          </div>
        </div>
      );
    }
  }
  ```

### Minor Changes

- a0bf339: **Fix `@Lazy` never rendering the component after intersection.** The `render` enhancement was returning a static `null`, which PraxisJS evaluated once inside `untrack()` — `visible()` never created a reactive subscription, so `visible.set(true)` from the IntersectionObserver had no effect. The enhancement now returns a reactive thunk `() => visible() ? render() : null` so the runtime tracks the signal and re-evaluates when intersection fires.

  `@Lazy` now also accepts an options object in addition to the plain number shorthand, adding `root` and `rootMargin` options for scoping intersection to a specific scroll container.

  ```tsx
  // before (still works)
  @Lazy(300)
  @Component()
  class HeavyChart extends StatefulComponent { ... }

  // new — scope to a scrollable container
  const scrollRoot = { current: null as HTMLDivElement | null }

  @Lazy({ placeholder: 300, root: scrollRoot, rootMargin: '0px' })
  @Component()
  class HeavyChart extends StatefulComponent { ... }

  // in render:
  <div ref={(el) => { scrollRoot.current = el }} style="overflow-y:auto;height:400px">
    <HeavyChart />
  </div>
  ```

  `root` accepts `{ current: HTMLElement | null }` (a ref object). When `root.current` is `null` at mount time, falls back to the viewport. `rootMargin` defaults to `"100px"`.

### Patch Changes

- 954e456: `@Compose` now accepts string literals as constructor arguments directly, without requiring an intermediate instance property.

  Previously, every string argument was unconditionally resolved as a property name on the component instance — passing `@Compose(KeyCombo, 'ctrl+s')` would look up `instance['ctrl+s']`, return `undefined`, and crash at runtime.

  Now the resolution falls back to the literal string when no matching property exists on the instance. A new `getter(propName)` helper is also exported for composables that need a live getter instead of a snapshot value:

  ```tsx
  import { getter } from '@praxisjs/decorators'

  @Compose(TimeAgo, getter('postedAt'))  // passes () => this.postedAt — reactive
  timeAgo!: TimeAgo
  ```

  Now the resolution falls back to the literal string when no matching property exists on the instance:

  ```ts
  // before — required a workaround property
  readonly saveCombo = "ctrl+s";
  @Compose(KeyCombo, "saveCombo") save!: KeyCombo;

  // after — works directly
  @Compose(KeyCombo, "ctrl+s") save!: KeyCombo;
  @Compose(MediaQuery, "(max-width: 768px)") mobile!: MediaQuery;
  ```

  Property-name resolution (used for forwarding refs like `@Compose(ElementSize, 'containerRef')`) is unchanged — if the named property exists on the instance, its value is used.

- a0bf339: Fix stacked class decorators (e.g. `@Lazy @Component`) re-entering the outermost enhancement's render recursively.

  When two `createClassDecorator`-based decorators are stacked, the inner one's `originalRender` closure called the outer Enhanced class's `render()`, which checked `this._enh.render` on the instance — always the outermost decorator's enhancement. This caused the outermost render enhancement to be called again instead of the user's actual render, returning a nested thunk that `normalizeToNodes` could not handle (functions are not Nodes → silently dropped).

  The fix tracks instances currently inside an `originalRender` call via a module-level `WeakSet`. When a render is invoked as `originalRender` from within an enhancement, the `this._enh.render` dispatch is skipped and the constructor's render is called directly, breaking the re-entry cycle.

## 0.8.1

### Patch Changes

- 9c7a165: fix: constrain `@State` and `@DeepState` to reactive classes only

  Introduces `ReactiveHost` (`{ _stateDirty: boolean }`) exported from `@praxisjs/decorators`. `@State` and `@DeepState` now use `createFieldDecorator<ReactiveHost>` with a generic `<This extends ReactiveHost, Value>` constraint, producing a TS error when applied to plain classes.

  `createFieldDecorator` now returns a generic function `<This extends T, Value>` so TypeScript infers the actual class type at the call site and checks the constraint against it instead of doing a fixed structural check.

  `@Store` is simplified to a plain class decorator (no longer uses `createClassDecorator`). A new `ReactiveStore` base class is exported from `@praxisjs/store` — store classes must extend it to satisfy the `ReactiveHost` constraint required by `@State` and `@DeepState`. Template updated accordingly.

## 0.8.0

### Minor Changes

- 2f08576: Add `@Synced` and `@DeepState` decorators. Fix `@Virtual` scroll handler.

  `@Synced(channelName?)` syncs a decorated field across browser tabs via `BroadcastChannel`. The channel name defaults to the field name.

  `@DeepState()` wraps an object or array in a deep `Proxy` so nested mutations (`this.config.theme.mode = 'dark'`, `this.items.push(x)`) trigger reactivity without needing to replace the reference.

  `@Virtual` — the scroll handler now captures the container reference at mount time (`const currentContainer = container`) instead of a conditional guard inside the callback.

### Patch Changes

- Updated dependencies [9affc5c]
  - @praxisjs/core@1.5.0

## 0.7.5

### Patch Changes

- aaf8a13: Fix `@Watch` (and `@When`, `@OnCommand`) TypeScript error when the decorated method uses typed parameters.

  `createLifecycleMethodDecorator` typed the decorated method value as `(...args: unknown[]) => void`. Because function parameters are checked contravariantly, TypeScript rejected methods with specific parameter types like `WatchVals<this, ...>` or `WatchVal<this, ...>`, producing an "Unable to resolve signature of method decorator" error.

  Changed `unknown[]` to `any[]` to match the existing pattern in `createMethodDecorator`, which accepts any method signature.

  `@Watch` with multiple props now coalesces simultaneous signal changes into a single callback invocation. When two or more watched props change in the same synchronous block, the callback fires once (via `queueMicrotask`) with the final values and the original pre-change values — instead of firing once per changed prop. Signal writes made inside the callback are automatically batched.

  `computed()` subscriber notification is now also coalesced via `queueMicrotask`. When multiple signal dependencies of a computed change in the same synchronous block, its leaf subscribers (DOM effects, `@Watch`, `.subscribe()`) are notified once with the final value. Dirty propagation through chained computeds still happens synchronously, so reads immediately after a signal change always return the correct derived value.

- Updated dependencies [aaf8a13]
  - @praxisjs/core@1.4.1

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
