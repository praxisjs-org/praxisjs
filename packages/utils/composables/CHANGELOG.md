# @praxisjs/composables

## 1.1.1

### Patch Changes

- Updated dependencies [74d414a]
  - @praxisjs/core@1.6.0

## 1.1.0

### Minor Changes

- fb8c10e: Add `VirtualList<T>` composable — a signal-based virtual scroll composable that replaces the `@Virtual` class decorator for use cases requiring reactive items and JSX `renderItem`.

  **Why composable instead of decorator:** `@Virtual` as a class decorator had two fundamental problems:
  1. `items` was read as a snapshot at render time — filtering or external changes were ignored.
  2. `renderItem` callbacks using JSX failed on scroll-triggered effect re-runs because `getCurrentScope()` was null outside the render phase.

  `VirtualList` solves both by exposing reactive signals that the component renders via normal JSX:

  ```tsx
  import { VirtualList, type VirtualItem } from "@praxisjs/composables";
  import { getter } from "@praxisjs/decorators";

  @Component()
  class UserTable extends StatefulComponent {
    @State() filter = "";
    containerRef = { current: null as HTMLDivElement | null };

    get rows() {
      return ROWS.filter((r) => r.name.includes(this.filter));
    }

    @Compose(VirtualList, "containerRef", getter("rows"), 48, 5)
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

  Exposed properties: `visibleItems: VirtualItem<T>[]`, `totalHeight: number`, `offsetTop: number`, `offsetBottom: number`.

### Patch Changes

- 4de74c4: Fix `ElementSize`, `Intersection`, and `Focus` not reacting after mount.

  All three composables used `effect()` inside `setup()` to watch `ref.current`. The effect ran during `bind()` (construction time) when the ref was still `null`, and since `ref.current` is a plain object mutation (not a signal write), the effect never re-ran after the DOM was ready.

  The fix moves the observer/listener setup to `onMount()`, which fires after the component is inserted into the DOM and ref callbacks have already run — guaranteeing `ref.current` is available.

  `ScrollPosition` also updated: now accepts `{ current: HTMLElement | null }` ref objects in addition to `HTMLElement | Window`, making it consistent with the other DOM composables. Listener setup moved to `onMount()` to correctly initialize scroll values.

## 1.0.6

### Patch Changes

- 9affc5c: Add `syncedSignal` primitive and fix internal dead-code branches.

  `syncedSignal(channelName, initialValue)` creates a signal that stays in sync across browser tabs in real-time via `BroadcastChannel`. Writes in any tab are broadcast to all other open tabs automatically.

  `batch()` — simplified the flush path by replacing the unreachable `batchQueue ?? new Set()` fallback with a direct `if (isOuter && batchQueue)` guard.

  `@praxisjs/composables` — removed no-op class field initializers (`_handler = () => {}`) that were immediately overwritten in `setup()`. Fields are now declared with `!` or typed as optional to reflect their real lifecycle.

- Updated dependencies [9affc5c]
  - @praxisjs/core@1.5.0

## 1.0.5

### Patch Changes

- Updated dependencies [aaf8a13]
  - @praxisjs/core@1.4.1

## 1.0.4

### Patch Changes

- Updated dependencies [994c581]
  - @praxisjs/core@1.4.0

## 1.0.3

### Patch Changes

- Updated dependencies [5a10864]
  - @praxisjs/core@1.3.0

## 1.0.2

### Patch Changes

- Updated dependencies [6c353ba]
  - @praxisjs/core@1.2.0

## 1.0.1

### Patch Changes

- 029ef04: All composables now cache their view object so calling `setup()` multiple times returns the same signals. `KeyCombo` gains meta key support and validates that at least one non-modifier key is present. `Clipboard` clears its reset timer on unmount. `Geolocation` ignores success/error callbacks after unmount. `Pagination` throws when `pageSize` is zero or negative.
- Updated dependencies [029ef04]
- Updated dependencies [029ef04]
- Updated dependencies [029ef04]
  - @praxisjs/core@1.1.0

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

### Patch Changes

- Updated dependencies [3372878]
  - @praxisjs/core@1.0.0

## 0.1.5

### Patch Changes

- Updated dependencies [d11a10a]
  - @praxisjs/core@0.4.2

## 0.1.4

### Patch Changes

- Updated dependencies [fe39901]
  - @praxisjs/core@0.4.1

## 0.1.3

### Patch Changes

- Updated dependencies [f52354d]
  - @praxisjs/core@0.4.0

## 0.1.2

### Patch Changes

- bb0d4f8: **Refactor decorator system and component architecture across PraxisJS packages**
  - Replaced legacy decorator signatures (`constructor`, `target`, `propertyKey`, method descriptor) with the standard TC39 decorator context API (`ClassDecoratorContext`, `ClassFieldDecoratorContext`, `ClassMethodDecoratorContext`) across `@praxisjs/decorators`, `@praxisjs/store`, `@praxisjs/concurrent`, `@praxisjs/router`, `@praxisjs/motion`, `@praxisjs/di`, and `@praxisjs/fsm`.
  - Introduced `StatefulComponent` and `StatelessComponent` as the new base classes, replacing the deprecated `BaseComponent`/`Function Component` pattern, across `@praxisjs/core`, `@praxisjs/runtime`, `@praxisjs/devtools`, and templates.
  - Implemented core rendering functionality in `@praxisjs/runtime` (`mountChildren`, `mountComponent`, reactive scope management) and removed the deprecated `renderer.ts`.
  - Refactored `@praxisjs/jsx` to delegate rendering to `@praxisjs/runtime` and improved type safety with `flattenChildren` and `isComponent` utilities.
  - Updated internal module structure with new `internal` exports in `package.json` files for shared utilities and types.
  - Removed `experimentalDecorators`/`emitDecoratorMetadata` from `tsconfig.json` in favor of native decorator support.

- Updated dependencies [bb0d4f8]
  - @praxisjs/core@0.3.0
  - @praxisjs/shared@0.2.0

## 0.1.1

### Patch Changes

- Updated dependencies [f48dbc4]
  - @praxisjs/core@0.2.0

## 0.1.0

### Minor Changes

- aaf7dab: Initial beta release

### Patch Changes

- Updated dependencies [aaf7dab]
  - @praxisjs/core@0.1.0
  - @praxisjs/shared@0.1.0
