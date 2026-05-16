---
"@praxisjs/core": minor
---

Rewrite the reactivity engine for clarity and performance.

**signal()** — subscribers are now stored in a compact `SubList` representation (`null | Effect | Effect[]`) that avoids `Set` allocation for the common zero- and single-subscriber cases. `set`, `update` and `subscribe` are defined as regular closures, making the signal factory straightforward to read and extend.

**computed()** — the factory now uses a plain closure instead of the previous property-on-function pattern. Downstream computeds (chain propagation) and leaf effects from `.subscribe()` are tracked in separate holders so dirty notification never needs to inspect subscriber types. The `recompute` callback is created lazily — only when the computed is first read inside a reactive context.

**effect()** — simplified to a standard closure with named `run` and `stop` functions. The `stopped` and `cleanup` state is held naturally in the closure scope.

**batch()** — uses a pre-allocated, module-level effects array that is reused across batch calls, eliminating one `Set` allocation per `batch()` invocation.

No breaking changes to the public API (`signal`, `computed`, `effect`, `batch`, `untrack`, `peek`).
