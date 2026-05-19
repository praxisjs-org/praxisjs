---
"@praxisjs/core": minor
"@praxisjs/decorators": minor
---

`@Resource` now supports shared cache, stale-while-revalidate, deduplication, key-based invalidation, and refetch on focus.

**New `ResourceOptions`:**
- `key` — shared cache key; all instances with the same key reuse in-flight requests and read from a single cache entry
- `staleTime` — ms before cached data is stale; at `0` (default) cached data is shown immediately while fresh data loads in the background (SWR)
- `refetchOnFocus` — refetches when `document.visibilityState` becomes `"visible"`

**New `Resource<T>` method:**
- `destroy()` — stops effects, removes focus listeners, and unregisters from the cache registry; called automatically by `@Resource` on component unmount

**New export:**
- `invalidateResource(key)` from `@praxisjs/decorators` — clears the named cache entry and triggers an immediate refetch on every active resource under that key

**Internal:**
- `debounced()` — removed a redundant `clearTimeout` call; the effect cleanup already handles it on every re-run
- `@Memo` `serializeArgs` — removed an unreachable `null` check in the `catch` block (`JSON.stringify(null)` never throws)
