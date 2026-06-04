---
"@praxisjs/router": minor
---

Add named routes, route meta, post-navigation lifecycle hooks, and scroll restoration.

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
