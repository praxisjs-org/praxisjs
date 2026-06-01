---
"@praxisjs/router": major
---

`RouteParams`, `RouteQuery`, and `RouteLocation` are now signal/computed types rather than plain objects, so field annotations no longer require importing `Signal` or `Computed` from `@praxisjs/core`.

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
