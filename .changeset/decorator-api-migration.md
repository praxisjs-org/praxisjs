---
"@praxisjs/core": major
"@praxisjs/motion": major
"@praxisjs/di": major
"@praxisjs/fsm": major
"@praxisjs/router": major
"@praxisjs/store": major
"@praxisjs/composables": major
"@praxisjs/concurrent": major
---

Migrate all packages from functional APIs to a decorator-first design.

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
