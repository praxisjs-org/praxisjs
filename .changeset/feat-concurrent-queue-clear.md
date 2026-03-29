---
"@praxisjs/concurrent": minor
---

`@Queue` now exposes a `{method}_clear()` method that cancels all queued calls, rejecting each promise with `QueueClearedError` (exported from `@praxisjs/concurrent`). `@Pool` clamps `concurrency` to a minimum of `1`.
