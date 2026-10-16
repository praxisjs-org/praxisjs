# @praxisjs/motion

## 1.2.0

### Minor Changes

- 75115a9: Export `createTransition()` and `TransitionOptions`. Its Promise-based `enter`/`leave` hooks work with the `transition` prop of `For` and `Index` in `@praxisjs/runtime`.

### Patch Changes

- 75115a9: Decorated fields are defined by their innermost decorator. With `@praxisjs/vite-plugin`, `@State()`, `@Prop()`, every built-in field decorator and `createFieldDecorator` bindings install their property directly with the field's initial value instead of replacing a plain value, which kept every instance in V8's slow dictionary mode. New `addClaimableInitializer(context, init)` export for field decorators written against the TC39 API.
- 75115a9: Field decorators throw a `TypeError` when the class is defined if they decorate an `accessor`, naming the member to fix. Covers `@State()`, `@Prop()`, every built-in field decorator and `createFieldDecorator` bindings. New `assertFieldContext(context, label?)` export for field decorators written against the TC39 API directly.
- 75115a9: Published packages no longer contain their tests: package builds compile `src` without `src/**/__tests__` (through a `tsconfig.build.json`), and each package's `files` leaves test sources and stale compiled tests out of the tarball. `pnpm typecheck` still type-checks the tests.
- 75115a9: Performance pass and bug fixes across the feature packages.
  - `@praxisjs/router`: static paths are matched through an index and dynamic ones with a single regex run; `RouterView` keeps a shared layout mounted across navigations; new `router.isActive(path)` (used by `Link`, so a navigation re-evaluates only the links whose state changed) and `router.destroy()`. Fixes regex characters in route paths (`.`, `(`, `+`...) being treated as patterns, and a router replaced by `createRouter()` still reacting to `popstate`. `@Route` no longer wraps the class, and the field decorators share one accessor.
  - `@praxisjs/store`: plugin-wrapped actions keep their identity across reads, extensions are bound once, and writing a field inside an effect no longer subscribes the effect to it. `constructor` and inherited `Object.prototype` members are no longer reported as actions. `@Store` caches the singleton.
  - `@praxisjs/motion`: `@Tween` and `@Spring` share one accessor per field and no longer start a frame loop at construction; `tween()`/`spring()` react to target writes without an effect. Fixes `reset()` leaving a tween marked as playing.
  - `@praxisjs/di`: cached singletons and tokens resolve without allocating, `@Injectable` registers the class itself instead of a subclass, and a dependency cycle through `inject()` calls in constructors now reports `[DI] Circular dependency detected` instead of overflowing the stack.
  - `@praxisjs/fsm`: `send()` and `reset()` no longer subscribe the calling effect to the machine state, transitions allocate nothing per send, and `@StateMachine` shares one accessor.
  - `@praxisjs/head`: tag diffing without `JSON.stringify` or a full `<head>` query per update; updating or removing an entry below the top one leaves the document alone, and removing an unknown id no longer resets the title.
  - `@praxisjs/content`: each entry is loaded, parsed and rendered once and shared by `getCollection`, `getPage` and `getEntry`; `getEntry` looks the slug up in an index; schema defaults are built once per class.

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

## 1.1.24

### Patch Changes

- 66ff549: `@Tween` and `@Spring` stop their running animation when the component unmounts.
- Updated dependencies [a97a37c]
- Updated dependencies [c7a5950]
  - @praxisjs/core@2.2.0
  - @praxisjs/decorators@1.7.0

## 1.1.23

### Patch Changes

- Updated dependencies [1ec5b2f]
  - @praxisjs/core@2.1.0
  - @praxisjs/decorators@1.6.1

## 1.1.22

### Patch Changes

- Updated dependencies [b24f603]
  - @praxisjs/decorators@1.6.0

## 1.1.21

### Patch Changes

- Updated dependencies [f1b7ee7]
  - @praxisjs/decorators@1.5.1

## 1.1.20

### Patch Changes

- Updated dependencies [55e645d]
- Updated dependencies [8ab6426]
  - @praxisjs/decorators@1.5.0
  - @praxisjs/core@2.0.0
  - @praxisjs/shared@0.3.1

## 1.1.19

### Patch Changes

- Updated dependencies [7d87288]
  - @praxisjs/core@1.8.3
  - @praxisjs/decorators@1.4.1

## 1.1.18

### Patch Changes

- Updated dependencies [bcaad96]
- Updated dependencies [376e38c]
  - @praxisjs/decorators@1.4.0
  - @praxisjs/core@1.8.2

## 1.1.17

### Patch Changes

- Updated dependencies [dc031d0]
  - @praxisjs/core@1.8.1
  - @praxisjs/decorators@1.3.1

## 1.1.16

### Patch Changes

- Updated dependencies [80442e0]
  - @praxisjs/decorators@1.3.0
  - @praxisjs/core@1.8.0
  - @praxisjs/shared@0.3.0

## 1.1.15

### Patch Changes

- Updated dependencies [3fb2309]
  - @praxisjs/decorators@1.2.0

## 1.1.14

### Patch Changes

- Updated dependencies [a0372af]
  - @praxisjs/decorators@1.1.1

## 1.1.13

### Patch Changes

- Updated dependencies [378cc54]
  - @praxisjs/core@1.7.0
  - @praxisjs/decorators@1.1.0

## 1.1.12

### Patch Changes

- Updated dependencies [cfb0de2]
  - @praxisjs/decorators@1.0.2

## 1.1.11

### Patch Changes

- Updated dependencies [74d414a]
  - @praxisjs/core@1.6.0
  - @praxisjs/decorators@1.0.1

## 1.1.10

### Patch Changes

- e5041e0: Fix `@Tween` animation restarting on every frame instead of completing.

  The `start()` helper inside `tween()` read `_value()` while executing inside the reactive `effect()` body. This accidentally subscribed the effect to the value signal, so every frame update (`_value.set(...)`) re-triggered the effect, which called `start()` again — resetting `startTime` and restarting the animation from the current intermediate value indefinitely.

  Fixed by wrapping the `_value()` read with `untrack()` so it does not register as a dependency of the effect.

- e5041e0: Fix `@Tween` and `@Spring` not animating when read in a reactive JSX expression before the first assignment.

  Previously both decorators created the tween/spring lazily on first `set()`. If the field was read inside a `{() => this.value}` expression before any write, the getter returned the fallback `0` without subscribing to the tween's signal — so the DOM effect never re-ran when the animation progressed.

  Both decorators now initialize eagerly in `bind()` using the field's initial value, so any reactive read immediately subscribes to the animated signal and updates correctly from the first frame.

- Updated dependencies [954e456]
- Updated dependencies [a0bf339]
- Updated dependencies [a0bf339]
- Updated dependencies [a8df1e1]
  - @praxisjs/decorators@1.0.0

## 1.1.9

### Patch Changes

- Updated dependencies [9c7a165]
  - @praxisjs/decorators@0.8.1

## 1.1.8

### Patch Changes

- Updated dependencies [9affc5c]
- Updated dependencies [2f08576]
  - @praxisjs/core@1.5.0
  - @praxisjs/decorators@0.8.0

## 1.1.7

### Patch Changes

- Updated dependencies [aaf8a13]
  - @praxisjs/core@1.4.1
  - @praxisjs/decorators@0.7.5

## 1.1.6

### Patch Changes

- Updated dependencies [994c581]
  - @praxisjs/core@1.4.0
  - @praxisjs/decorators@0.7.4

## 1.1.5

### Patch Changes

- Updated dependencies [5a10864]
  - @praxisjs/core@1.3.0
  - @praxisjs/decorators@0.7.3

## 1.1.4

### Patch Changes

- Updated dependencies [2c61a25]
  - @praxisjs/decorators@0.7.2

## 1.1.3

### Patch Changes

- Updated dependencies [6c353ba]
  - @praxisjs/core@1.2.0
  - @praxisjs/decorators@0.7.1

## 1.1.2

### Patch Changes

- Updated dependencies [2b8c768]
  - @praxisjs/decorators@0.7.0

## 1.1.1

### Patch Changes

- Updated dependencies [72cd9a8]
  - @praxisjs/decorators@0.6.1

## 1.1.0

### Minor Changes

- 029ef04: `@Spring` now throws when `stiffness` is `0` or negative. `@Tween` clamps `duration` to a minimum of `1ms`. Unknown easing names throw an error listing valid options. Errors thrown in `onEnter`/`onLeave` transition callbacks now reject the transition promise instead of going unhandled.

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
