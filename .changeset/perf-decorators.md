---
"@praxisjs/decorators": minor
---

Cheaper decorators per instance and per call. Method decorators (`@Bind`, `@Once`, `@Throttle`, `@Debounce`, `@Retry`, `@Log`, `@Memo`, `@Emit`, `@Until`) replace the method once on the class and bind it lazily on first read, field decorators share one accessor pair per field with per-instance state in symbol slots, lifecycle hooks chain without bound functions, and slots, `@Persisted` and `@Synced` no longer read `WeakMap`s. Fixes `@Until` on `@State` fields, a leaked registration when `onMount()` runs twice, stacked method decorators dropping all but one, and method decorators on private methods doing nothing.
