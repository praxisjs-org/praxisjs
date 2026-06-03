# @praxisjs/store

## 1.2.3

### Patch Changes

- Updated dependencies [3fb2309]
  - @praxisjs/decorators@1.2.0

## 1.2.2

### Patch Changes

- Updated dependencies [a0372af]
  - @praxisjs/decorators@1.1.1

## 1.2.1

### Patch Changes

- Updated dependencies [378cc54]
  - @praxisjs/core@1.7.0
  - @praxisjs/decorators@1.1.0

## 1.2.0

### Minor Changes

- 4ec660f: Rename decorators for consistency: `@Store()` → `@Storable()` (class decorator), `@UseStore(Class)` → `@Store(Class)` (field decorator), `useStore()` → `store()` (imperative function).

### Patch Changes

- Updated dependencies [cfb0de2]
  - @praxisjs/decorators@1.0.2

## 1.1.0

### Minor Changes

- 22da23e: Add `useStore()` — functional alternative to `@UseStore` for use outside component context.

  ```ts
  import { useStore } from "@praxisjs/store";

  const cart = useStore(CartStore);
  ```

  Resolves from the same global registry as `@UseStore` — always returns the same singleton instance. Useful in route guards, plain functions, and any place where a class field decorator is unavailable.

## 1.0.12

### Patch Changes

- Updated dependencies [74d414a]
  - @praxisjs/core@1.6.0
  - @praxisjs/decorators@1.0.1

## 1.0.11

### Patch Changes

- Updated dependencies [954e456]
- Updated dependencies [a0bf339]
- Updated dependencies [a0bf339]
- Updated dependencies [a8df1e1]
  - @praxisjs/decorators@1.0.0

## 1.0.10

### Patch Changes

- 9c7a165: fix: constrain `@State` and `@DeepState` to reactive classes only

  Introduces `ReactiveHost` (`{ _stateDirty: boolean }`) exported from `@praxisjs/decorators`. `@State` and `@DeepState` now use `createFieldDecorator<ReactiveHost>` with a generic `<This extends ReactiveHost, Value>` constraint, producing a TS error when applied to plain classes.

  `createFieldDecorator` now returns a generic function `<This extends T, Value>` so TypeScript infers the actual class type at the call site and checks the constraint against it instead of doing a fixed structural check.

  `@Store` is simplified to a plain class decorator (no longer uses `createClassDecorator`). A new `ReactiveStore` base class is exported from `@praxisjs/store` — store classes must extend it to satisfy the `ReactiveHost` constraint required by `@State` and `@DeepState`. Template updated accordingly.

- Updated dependencies [9c7a165]
  - @praxisjs/decorators@0.8.1

## 1.0.9

### Patch Changes

- Updated dependencies [9affc5c]
- Updated dependencies [2f08576]
  - @praxisjs/core@1.5.0
  - @praxisjs/decorators@0.8.0

## 1.0.8

### Patch Changes

- Updated dependencies [aaf8a13]
  - @praxisjs/core@1.4.1
  - @praxisjs/decorators@0.7.5

## 1.0.7

### Patch Changes

- Updated dependencies [994c581]
  - @praxisjs/core@1.4.0
  - @praxisjs/decorators@0.7.4

## 1.0.6

### Patch Changes

- Updated dependencies [5a10864]
  - @praxisjs/core@1.3.0
  - @praxisjs/decorators@0.7.3

## 1.0.5

### Patch Changes

- Updated dependencies [2c61a25]
  - @praxisjs/decorators@0.7.2

## 1.0.4

### Patch Changes

- Updated dependencies [6c353ba]
  - @praxisjs/core@1.2.0
  - @praxisjs/decorators@0.7.1

## 1.0.3

### Patch Changes

- Updated dependencies [2b8c768]
  - @praxisjs/decorators@0.7.0

## 1.0.2

### Patch Changes

- Updated dependencies [72cd9a8]
  - @praxisjs/decorators@0.6.1

## 1.0.1

### Patch Changes

- 029ef04: `$patch` now skips `undefined` values, preventing partial updates from overwriting existing state with `undefined`.
- Updated dependencies [029ef04]
- Updated dependencies [029ef04]
- Updated dependencies [029ef04]
- Updated dependencies [029ef04]
- Updated dependencies [029ef04]
  - @praxisjs/core@1.1.0
  - @praxisjs/decorators@0.6.0

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
- Updated dependencies [feaa478]
  - @praxisjs/core@1.0.0
  - @praxisjs/decorators@0.5.0

## 0.2.3

### Patch Changes

- Updated dependencies [d11a10a]
  - @praxisjs/core@0.4.2

## 0.2.2

### Patch Changes

- fe39901: fix(store): fix `TypeError` when assigning symbol keys on the store Proxy

  The Proxy `set` trap returned `false` for non-string keys (symbols). In ES modules with strict mode, returning `false` from a `set` trap throws `TypeError: 'set' on proxy: trap returned falsish`. This broke internal JavaScript operations that use symbol keys (e.g. `Symbol.toPrimitive`, `Symbol.iterator`).

  The fix returns `true` in those cases, silently ignoring the assignment — the correct behaviour, since the store only manages string keys.

- Updated dependencies [fe39901]
  - @praxisjs/core@0.4.1

## 0.2.1

### Patch Changes

- Updated dependencies [f52354d]
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
  - @praxisjs/core@0.3.0

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
