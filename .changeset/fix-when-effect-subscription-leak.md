---
"@praxisjs/core": patch
---

fix(core): fix effect subscription leak in `when()` when source is immediately truthy

When `source()` returned a truthy value on the first synchronous effect run, `stop` was still `undefined` at that point. The `stop?.()` call inside the callback was a no-op, leaving the effect subscribed forever — any future change to the source kept triggering the effect (which returned early via `disposed`, but still maintained its reactive tracking).

The implementation was refactored to use a `ref` object (`{ cancel }`) to hold the cancellation function. This allows `stop` to be declared as `const`, removes the optional chain on a non-nullable type, and ensures the effect is properly cancelled via `if (disposed) stop()` after the first synchronous run.
