---
"@praxisjs/core": minor
---

`debounced()` now returns a signal with a `.stop()` method to cancel the pending timer and its effect. Synchronous throws inside a `resource` fetcher are now caught and set the resource to error state instead of propagating uncaught.
