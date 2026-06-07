---
"@praxisjs/core": patch
---

Clean up stale reactive dependencies and keyed resource cache state.

Effects now unsubscribe from dependencies they no longer read, and computed values drop stale branch subscriptions before recomputing. Signal notifications also iterate over a stable snapshot so subscriber changes during notification do not skip remaining listeners.

Keyed resources now update the shared cache when `mutate()` is called, and settled in-flight requests are cleared even when the local result became stale after `cancel()`.
