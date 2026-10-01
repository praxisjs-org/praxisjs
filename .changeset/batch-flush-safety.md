---
"@praxisjs/core": minor
---

`batch()` deduplicates queued effects with a `Set` (was an O(n²) array scan). Fixed a bug where an effect that threw during a batch flush skipped the remaining effects and left stale entries in the queue; the flush now runs every effect and rethrows the last error afterwards.

Subscriber lists switch from an array to a `Set` once they hold more than 16 effects, so a signal read by thousands of bindings no longer updates in quadratic time (one signal driving 20,000 effects: ~47 ms → ~1.6 ms per update in a browser benchmark). Subscription order is unchanged.

`persistedSignal()` gains a `close()` method that removes its `storage` listener.

`persistedSignal()` takes a `writeDelay` option that coalesces `localStorage` writes (flushed on `pagehide` and `close()`). `history()` gains `destroy()`, and `computed` gains an internal `dispose()` that releases its source subscriptions when nothing depends on it.
