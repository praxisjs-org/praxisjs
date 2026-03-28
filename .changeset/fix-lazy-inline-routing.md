---
"@praxisjs/router": patch
---

Fix `Lazy()` not rendering when used inline in route definitions, and add `@Route` co-location support in `@RouterConfig`.

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
