---
"@praxisjs/core": patch
---

Fix `effect()` stop function not preventing re-runs

The function returned by `effect()` was only calling the cleanup callback but leaving the effect subscribed to all tracked signals, so it would keep re-running after being stopped. The stop function now sets a `stopped` flag that makes future invocations of the wrapped effect a no-op, and nullifies the cleanup reference to ensure idempotent behaviour.

This also fixes `$subscribe` unsubscription in `@praxisjs/store`, which relied on this mechanism to detach listeners.
