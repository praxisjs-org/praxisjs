---
"@praxisjs/decorators": minor
---

`@Persisted` now removes its `window` `storage` listener when the component unmounts (each instance used to leave one behind). `@DeepState` returns one stable proxy per nested object instead of a new `Proxy` per read, and no longer notifies for no-op assignments, deletes of missing keys, or the redundant `length` write of an array `push`.

`@Memo` keeps the 100 most recently used argument combinations by default (least-recently-used eviction); `@Memo({ max })` changes the limit and `Infinity` restores the unbounded cache. `@History` stops tracking on unmount.
