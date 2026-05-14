---
"@praxisjs/core": minor
"@praxisjs/composables": patch
"create-praxisjs": patch
---

Add `syncedSignal` primitive and fix internal dead-code branches.

`syncedSignal(channelName, initialValue)` creates a signal that stays in sync across browser tabs in real-time via `BroadcastChannel`. Writes in any tab are broadcast to all other open tabs automatically.

`batch()` — simplified the flush path by replacing the unreachable `batchQueue ?? new Set()` fallback with a direct `if (isOuter && batchQueue)` guard.

`@praxisjs/composables` — removed no-op class field initializers (`_handler = () => {}`) that were immediately overwritten in `setup()`. Fields are now declared with `!` or typed as optional to reflect their real lifecycle.
