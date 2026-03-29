# @praxisjs/composables

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
