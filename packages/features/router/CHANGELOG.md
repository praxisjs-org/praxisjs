# @praxisjs/router

## 2.3.1

### Patch Changes

- @praxisjs/jsx@0.8.1

## 2.3.0

### Minor Changes

- 75115a9: Performance pass and bug fixes across the feature packages.
  - `@praxisjs/router`: static paths are matched through an index and dynamic ones with a single regex run; `RouterView` keeps a shared layout mounted across navigations; new `router.isActive(path)` (used by `Link`, so a navigation re-evaluates only the links whose state changed) and `router.destroy()`. Fixes regex characters in route paths (`.`, `(`, `+`...) being treated as patterns, and a router replaced by `createRouter()` still reacting to `popstate`. `@Route` no longer wraps the class, and the field decorators share one accessor.
  - `@praxisjs/store`: plugin-wrapped actions keep their identity across reads, extensions are bound once, and writing a field inside an effect no longer subscribes the effect to it. `constructor` and inherited `Object.prototype` members are no longer reported as actions. `@Store` caches the singleton.
  - `@praxisjs/motion`: `@Tween` and `@Spring` share one accessor per field and no longer start a frame loop at construction; `tween()`/`spring()` react to target writes without an effect. Fixes `reset()` leaving a tween marked as playing.
  - `@praxisjs/di`: cached singletons and tokens resolve without allocating, `@Injectable` registers the class itself instead of a subclass, and a dependency cycle through `inject()` calls in constructors now reports `[DI] Circular dependency detected` instead of overflowing the stack.
  - `@praxisjs/fsm`: `send()` and `reset()` no longer subscribe the calling effect to the machine state, transitions allocate nothing per send, and `@StateMachine` shares one accessor.
  - `@praxisjs/head`: tag diffing without `JSON.stringify` or a full `<head>` query per update; updating or removing an entry below the top one leaves the document alone, and removing an unknown id no longer resets the title.
  - `@praxisjs/content`: each entry is loaded, parsed and rendered once and shared by `getCollection`, `getPage` and `getEntry`; `getEntry` looks the slug up in an index; schema defaults are built once per class.

### Patch Changes

- 75115a9: Decorated fields are defined by their innermost decorator. With `@praxisjs/vite-plugin`, `@State()`, `@Prop()`, every built-in field decorator and `createFieldDecorator` bindings install their property directly with the field's initial value instead of replacing a plain value, which kept every instance in V8's slow dictionary mode. New `addClaimableInitializer(context, init)` export for field decorators written against the TC39 API.
- 75115a9: Edge-case fixes in the new fast paths. `@praxisjs/vite-plugin` keeps a claimed field's initializer in the field's own scope instead of moving it into the constructor, where a constructor parameter or local of the same name shadowed what it read (and `new.target` fields are claimed too). `selector()` from `@praxisjs/core` compares against the current source value when read outside an effect, also inside a batch or an event handler before its subscribers are notified. `@praxisjs/runtime` keeps updating a hydrated element through a reactive child that fills it alone, rebuilds compiled templates when `render()` runs with another global document (a new SSG window), and always writes `open`, `selectedIndex`, media and scroll props from reactive bindings so a re-run restores what the user changed. Compiled templates keep the leading whitespace of JSX text (`{v} / {m}` lost its first space) and keep tabs inside a line, as the JSX transform does. Methods of `@Bind`, `@Emit` and the other built-in method decorators can be spied on with `vi.spyOn(instance, name)` before their first read again. `@praxisjs/router`'s `Link` removes its `class` attribute when it stops being active instead of leaving `class=""`.
- 75115a9: Field decorators throw a `TypeError` when the class is defined if they decorate an `accessor`, naming the member to fix. Covers `@State()`, `@Prop()`, every built-in field decorator and `createFieldDecorator` bindings. New `assertFieldContext(context, label?)` export for field decorators written against the TC39 API directly.
- 75115a9: Published packages no longer contain their tests: package builds compile `src` without `src/**/__tests__` (through a `tsconfig.build.json`), and each package's `files` leaves test sources and stale compiled tests out of the tarball. `pnpm typecheck` still type-checks the tests.
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
- Updated dependencies [75115a9]
- Updated dependencies [75115a9]
  - @praxisjs/decorators@2.0.0
  - @praxisjs/core@2.3.0
  - @praxisjs/jsx@0.8.0
  - @praxisjs/shared@0.3.2

## 2.2.2

### Patch Changes

- @praxisjs/jsx@0.7.7

## 2.2.1

### Patch Changes

- 7f68df1: Resolve a route's component and layout in parallel and apply them in one update, so `RouterView` rebuilds once with a consistent pair (no layout-less flash, no sequential lazy-chunk waterfall). Plain and already-loaded lazy routes are applied synchronously. A layout that fails to load still rejects the navigation after the page is shown. Route matching runs once per path.
- Updated dependencies [a97a37c]
- Updated dependencies [c7a5950]
  - @praxisjs/core@2.2.0
  - @praxisjs/decorators@1.7.0
  - @praxisjs/jsx@0.7.6

## 2.2.0

### Minor Changes

- 9ceee18: Expose `createRouter` from `@praxisjs/router/internal`. `@praxisjs/ssg`'s prerender runner needs to rebind the router to a fresh `window.location` before rendering each route — the `@Router([...])` class decorator only calls `createRouter` once, at the first time the app module is imported.

  Fix: the router's initial navigation (resolving the component/layout for the starting URL, kicked off unawaited from the constructor) is now tracked as a pending resource via `@praxisjs/core/internal`'s `trackPendingResource()`. Previously, a `@praxisjs/ssg` prerender pass for a `Lazy(...)`-wrapped route could serialize the page — and close its underlying Vite SSR module runner — before that dynamic import settled, producing pages with missing route content and, once the import finally resolved against an already-closed module runner, an unhandled rejection that crashed the build. This is a no-op outside of a server render pass, so client-side navigation is unaffected.

### Patch Changes

- Updated dependencies [1ec5b2f]
  - @praxisjs/core@2.1.0
  - @praxisjs/decorators@1.6.1
  - @praxisjs/jsx@0.7.5

## 2.1.8

### Patch Changes

- Updated dependencies [b24f603]
  - @praxisjs/decorators@1.6.0
  - @praxisjs/jsx@0.7.4

## 2.1.7

### Patch Changes

- Updated dependencies [f1b7ee7]
  - @praxisjs/decorators@1.5.1
  - @praxisjs/jsx@0.7.3

## 2.1.6

### Patch Changes

- Updated dependencies [55e645d]
- Updated dependencies [8ab6426]
  - @praxisjs/decorators@1.5.0
  - @praxisjs/core@2.0.0
  - @praxisjs/shared@0.3.1
  - @praxisjs/jsx@0.7.2

## 2.1.5

### Patch Changes

- Updated dependencies [7d87288]
  - @praxisjs/core@1.8.3
  - @praxisjs/decorators@1.4.1
  - @praxisjs/jsx@0.7.1

## 2.1.4

### Patch Changes

- Updated dependencies [92d8213]
  - @praxisjs/jsx@0.7.0

## 2.1.3

### Patch Changes

- Updated dependencies [b36b1fd]
  - @praxisjs/jsx@0.6.1

## 2.1.2

### Patch Changes

- Updated dependencies [bcaad96]
- Updated dependencies [376e38c]
- Updated dependencies [4060b4f]
  - @praxisjs/decorators@1.4.0
  - @praxisjs/core@1.8.2
  - @praxisjs/jsx@0.6.0

## 2.1.1

### Patch Changes

- Updated dependencies [dc031d0]
- Updated dependencies [dc031d0]
  - @praxisjs/core@1.8.1
  - @praxisjs/jsx@0.5.4
  - @praxisjs/decorators@1.3.1

## 2.1.0

### Minor Changes

- e2c7317: Add named routes, route meta, post-navigation lifecycle hooks, and scroll restoration.

  **Named routes** — give routes a `name` and navigate by name instead of hardcoding paths.
  - `name?: string` on `RouteDefinition` and on `@Route({ path, name, meta })` options
  - `push({ name, params?, query?, hash? })` and `replace({ name, ... })` — navigate by name
  - `router.resolvePath({ name, params? })` — resolve a named target to a path string
  - `<Link to={{ name, params?, query?, hash? }}>` — `to` now accepts `string | NamedNavigationTarget`
  - Exported: `NamedNavigationTarget`, `NavigationInput`

  **Route meta** — attach arbitrary metadata to any route.
  - `meta?: Record<string, unknown>` on `RouteDefinition` / `@Route` options
  - `location().meta` and `location().name` — available on every `RouteLocationInternal`
  - `router.meta` — `Computed<RouteMeta>` shorthand
  - `@Meta()` — field decorator injecting `router.meta`
  - `useMeta()` — composable returning `router.meta`
  - Exported: `RouteMeta`, `RouteOptions`

  **Navigation hooks** — post-navigation callbacks for analytics, focus management, and side effects.
  - `afterEnter?: (to, from) => void` on `RouteDefinition` — per-route hook, fires after component resolves
  - `router.afterEach(handler)` — global hook, fires after every completed navigation; returns an unregister function
  - Navigation blocked by `beforeEnter` does not trigger `afterEach`

  **Scroll restoration** — configurable scroll behavior per navigation.
  - `scrollBehavior` option on `RouterOptions` / `createRouter(routes, { scrollBehavior })` / `@Router([...], { scrollBehavior })`
  - Receives `(to, from, savedPosition)` — `savedPosition` is non-null on back/forward navigations
  - Return `{ top, left }`, `{ el }`, or `false` (skip); `Promise` is supported
  - Scroll position saved into `history.state` before each `push()` for automatic back/forward restoration

  Exported types: `ScrollPosition`, `ScrollBehavior`, `SavedScrollPosition`, `RouterOptions`.

### Patch Changes

- Updated dependencies [80442e0]
  - @praxisjs/decorators@1.3.0
  - @praxisjs/core@1.8.0
  - @praxisjs/shared@0.3.0
  - @praxisjs/jsx@0.5.3

## 2.0.2

### Patch Changes

- Updated dependencies [3fb2309]
  - @praxisjs/decorators@1.2.0
  - @praxisjs/jsx@0.5.2

## 2.0.1

### Patch Changes

- Updated dependencies [a0372af]
  - @praxisjs/decorators@1.1.1
  - @praxisjs/jsx@0.5.1

## 2.0.0

### Major Changes

- f9cb9fb: `RouteParams`, `RouteQuery`, and `RouteLocation` are now signal/computed types rather than plain objects, so field annotations no longer require importing `Signal` or `Computed` from `@praxisjs/core`.

  **Before**

  ```tsx
  import type { Computed, Signal } from '@praxisjs/shared'

  @Params()   params!:   Computed<RouteParams>
  @Query()    query!:    Computed<RouteQuery>
  @Location() location!: Signal<RouteLocation>
  ```

  **After**

  ```tsx
  @Params()   params!:   RouteParams
  @Query()    query!:    RouteQuery
  @Location() location!: RouteLocation
  ```

  A new `LayoutInstance` type alias is exported for `@InjectLayout()` fields, replacing the manual `Signal<RouteComponent | null>` annotation.

  **Migration** — if you typed `beforeEnter` guards or `push`/`replace` calls with the old plain-object `RouteLocation` / `RouteQuery`, those types are now internal. Either remove the explicit annotation (TypeScript infers from context) or use `Parameters<RouteDefinition['beforeEnter']>[0]` to derive the plain-object type.

## 1.2.0

### Minor Changes

- 618152a: Route paths now support optional segments with the `:param?` syntax.

  Appending `?` to any named segment makes it optional — the router matches both the path with the segment present and the path with it absent. When a segment is absent, its param value defaults to `""`.

  ```ts
  @Router([
    { path: '/posts/:slug?', component: PostPage },
  ])
  ```

  - `/posts/hello-world` → `params().slug === 'hello-world'`
  - `/posts/` → `params().slug === ''`

### Patch Changes

- Updated dependencies [41eb531]
- Updated dependencies [378cc54]
  - @praxisjs/jsx@0.5.0
  - @praxisjs/core@1.7.0
  - @praxisjs/decorators@1.1.0

## 1.1.0

### Minor Changes

- 4ec660f: **Breaking:** `@RouterConfig` → `@Router`; `@InjectRouter()` merged into `@Router()` (dual-purpose field/class decorator); `Router` class → `RouterInstance`.

  Add layout system: `layout?` on `RouteDefinition`, automatic layout inheritance via `children`, `<RouterOutlet>` component, `@InjectLayout()` field decorator, and `RouterInstance.currentLayout` signal.

  Implement `@Router` with `createClassDecorator` + `ClassBehavior` (`RouterBehavior.create()` re-activates the correct router per instantiation, fixing singleton conflicts when multiple `@Router` classes share module scope).

  Fix concurrent navigation: `_navSeq` counter ensures the latest `push()` always wins — stale in-flight resolutions are discarded.

### Patch Changes

- Updated dependencies [cfb0de2]
- Updated dependencies [b9411cb]
  - @praxisjs/decorators@1.0.2
  - @praxisjs/jsx@0.4.6

## 1.0.13

### Patch Changes

- Updated dependencies [74d414a]
  - @praxisjs/core@1.6.0
  - @praxisjs/decorators@1.0.1
  - @praxisjs/jsx@0.4.5

## 1.0.12

### Patch Changes

- 30848cc: Add `style` prop support to `Link`. Accepts both a CSS string (`style="color:red"`) and a style object (`style={styleObject}`), matching the standard JSX element behavior.
- Updated dependencies [954e456]
- Updated dependencies [a0bf339]
- Updated dependencies [a0bf339]
- Updated dependencies [a8df1e1]
  - @praxisjs/decorators@1.0.0
  - @praxisjs/jsx@0.4.4

## 1.0.11

### Patch Changes

- Updated dependencies [9c7a165]
  - @praxisjs/decorators@0.8.1
  - @praxisjs/jsx@0.4.3

## 1.0.10

### Patch Changes

- Updated dependencies [9affc5c]
- Updated dependencies [2f08576]
  - @praxisjs/core@1.5.0
  - @praxisjs/decorators@0.8.0
  - @praxisjs/jsx@0.4.2

## 1.0.9

### Patch Changes

- Updated dependencies [aaf8a13]
  - @praxisjs/core@1.4.1
  - @praxisjs/decorators@0.7.5
  - @praxisjs/jsx@0.4.1

## 1.0.8

### Patch Changes

- Updated dependencies [994c581]
- Updated dependencies [994c581]
  - @praxisjs/jsx@0.4.0
  - @praxisjs/core@1.4.0
  - @praxisjs/decorators@0.7.4

## 1.0.7

### Patch Changes

- Updated dependencies [5a10864]
  - @praxisjs/core@1.3.0
  - @praxisjs/decorators@0.7.3
  - @praxisjs/jsx@0.3.10

## 1.0.6

### Patch Changes

- Updated dependencies [2c61a25]
  - @praxisjs/decorators@0.7.2
  - @praxisjs/jsx@0.3.9

## 1.0.5

### Patch Changes

- Updated dependencies [6c353ba]
  - @praxisjs/core@1.2.0
  - @praxisjs/decorators@0.7.1
  - @praxisjs/jsx@0.3.8

## 1.0.4

### Patch Changes

- Updated dependencies [2b8c768]
  - @praxisjs/decorators@0.7.0
  - @praxisjs/jsx@0.3.7

## 1.0.3

### Patch Changes

- Updated dependencies [72cd9a8]
  - @praxisjs/decorators@0.6.1
  - @praxisjs/jsx@0.3.6

## 1.0.2

### Patch Changes

- Updated dependencies [029ef04]
- Updated dependencies [029ef04]
- Updated dependencies [029ef04]
- Updated dependencies [029ef04]
- Updated dependencies [029ef04]
  - @praxisjs/core@1.1.0
  - @praxisjs/decorators@0.6.0
  - @praxisjs/jsx@0.3.5

## 1.0.1

### Patch Changes

- dd38adf: Fix `Lazy()` not rendering when used inline in route definitions, and add `@Route` co-location support in `@RouterConfig`.

  **Bug fixes:**
  - `Lazy(loader)` used inline as `{ path, component: Lazy(...) }` silently rendered nothing — the returned decorator function had no `__isLazy` marker so the router treated it as a plain component. `Lazy` now returns a dual-purpose function with `__isLazy: true` that works both inline and as a class decorator.
  - `@Route` caused a TypeScript error when applied to components whose constructor accepts typed props.

  **New behavior:**
  - `@RouterConfig` now accepts classes decorated with `@Route` directly, without wrapping them in a `{ path, component }` object — the path is read from `__routePath` automatically. Both forms can be mixed in the same array:

  ```ts
  @RouterConfig([
    Home,    // path comes from @Route('/')
    About,   // path comes from @Route('/about')
    { path: '/users/:id', component: Lazy(() => import('./pages/UserDetail')) },
  ])
  ```

  - Lazy-loaded pages must use `export default class` — the loader resolves `module.default` at runtime.

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
  - @praxisjs/jsx@0.3.4

## 0.2.5

### Patch Changes

- Updated dependencies [ea59035]
- Updated dependencies [d11a10a]
  - @praxisjs/decorators@0.4.3
  - @praxisjs/core@0.4.2
  - @praxisjs/jsx@0.3.3

## 0.2.4

### Patch Changes

- fe39901: fix(router): fix infinite recursion in chained `beforeEnter` redirects

  When a `beforeEnter` guard returned a string (redirect path), `push()` called itself recursively with no depth limit. A configuration like `A → B → A` would overflow the call stack.

  The fix introduces an internal `_redirectDepth` parameter that increments on each redirect. Once the limit of 10 hops is reached, navigation is aborted and a warning is logged to the console.

- Updated dependencies [fe39901]
- Updated dependencies [fe39901]
  - @praxisjs/decorators@0.4.2
  - @praxisjs/core@0.4.1
  - @praxisjs/jsx@0.3.2

## 0.2.3

### Patch Changes

- Updated dependencies [966efdc]
  - @praxisjs/jsx@0.3.1
  - @praxisjs/decorators@0.4.1

## 0.2.2

### Patch Changes

- Updated dependencies [339a97d]
  - @praxisjs/jsx@0.3.0

## 0.2.1

### Patch Changes

- Updated dependencies [f52354d]
  - @praxisjs/decorators@0.4.0
  - @praxisjs/core@0.4.0
  - @praxisjs/jsx@0.2.1

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
  - @praxisjs/jsx@0.2.0
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
  - @praxisjs/jsx@0.1.0
  - @praxisjs/shared@0.1.0
