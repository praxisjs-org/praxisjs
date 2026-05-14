# @praxisjs/concurrent

## 1.2.6

### Patch Changes

- Updated dependencies [9affc5c]
- Updated dependencies [2f08576]
  - @praxisjs/core@1.5.0
  - @praxisjs/decorators@0.8.0

## 1.2.5

### Patch Changes

- Updated dependencies [aaf8a13]
  - @praxisjs/core@1.4.1
  - @praxisjs/decorators@0.7.5

## 1.2.4

### Patch Changes

- Updated dependencies [994c581]
  - @praxisjs/core@1.4.0
  - @praxisjs/decorators@0.7.4

## 1.2.3

### Patch Changes

- Updated dependencies [5a10864]
  - @praxisjs/core@1.3.0
  - @praxisjs/decorators@0.7.3

## 1.2.2

### Patch Changes

- Updated dependencies [2c61a25]
  - @praxisjs/decorators@0.7.2

## 1.2.1

### Patch Changes

- Updated dependencies [6c353ba]
  - @praxisjs/core@1.2.0
  - @praxisjs/decorators@0.7.1

## 1.2.0

### Minor Changes

- 21f2053: Redesign `@Task`, `@Queue`, and `@Pool` as field decorators

  The decorators now go on a separate field instead of the async method itself. The method name is always the first argument, followed by options. Reactive state is accessed as sub-properties on the field with full TypeScript intellisense via `TaskOf`, `QueueOf`, and `PoolOf` type helpers.

  ```ts
  // Before
  @Task()
  async loadUser(id: number) { ... }
  // this.loadUser_loading() — no intellisense

  // After
  async loadUser(id: number) { ... }

  @Task('loadUser')
  taskLoadUser!: TaskOf<MyClass, 'loadUser'>
  // this.taskLoadUser.loading()  ✓
  // this.taskLoadUser.error()    ✓
  ```

  `@Pool` argument order changed: method name is now first, concurrency second (previously `@Pool(3, 'method')`, now `@Pool('method', 3)`).

### Patch Changes

- Updated dependencies [2b8c768]
  - @praxisjs/decorators@0.7.0

## 1.1.1

### Patch Changes

- 72cd9a8: Fix method decorators rejecting typed parameters

  `createMethodDecorator` used `unknown[]` for the method value type, which caused TypeScript to reject decorated methods with typed parameters (e.g. `async loadUser(id: number)`). Changed to `any[]` so the decorator accepts any async method signature. Updated the `Task`, `Queue`, and `Pool` decorator casts in `@praxisjs/concurrent` accordingly.

- Updated dependencies [72cd9a8]
  - @praxisjs/decorators@0.6.1

## 1.1.0

### Minor Changes

- 029ef04: `@Queue` now exposes a `{method}_clear()` method that cancels all queued calls, rejecting each promise with `QueueClearedError` (exported from `@praxisjs/concurrent`). `@Pool` clamps `concurrency` to a minimum of `1`.

### Patch Changes

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
