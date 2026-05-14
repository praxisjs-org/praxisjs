---
"@praxisjs/core": patch
"@praxisjs/decorators": patch
"create-praxisjs": patch
---

Fix `@Watch` (and `@When`, `@OnCommand`) TypeScript error when the decorated method uses typed parameters.

`createLifecycleMethodDecorator` typed the decorated method value as `(...args: unknown[]) => void`. Because function parameters are checked contravariantly, TypeScript rejected methods with specific parameter types like `WatchVals<this, ...>` or `WatchVal<this, ...>`, producing an "Unable to resolve signature of method decorator" error.

Changed `unknown[]` to `any[]` to match the existing pattern in `createMethodDecorator`, which accepts any method signature.

`@Watch` with multiple props now coalesces simultaneous signal changes into a single callback invocation. When two or more watched props change in the same synchronous block, the callback fires once (via `queueMicrotask`) with the final values and the original pre-change values — instead of firing once per changed prop. Signal writes made inside the callback are automatically batched.

`computed()` subscriber notification is now also coalesced via `queueMicrotask`. When multiple signal dependencies of a computed change in the same synchronous block, its leaf subscribers (DOM effects, `@Watch`, `.subscribe()`) are notified once with the final value. Dirty propagation through chained computeds still happens synchronously, so reads immediately after a signal change always return the correct derived value.
