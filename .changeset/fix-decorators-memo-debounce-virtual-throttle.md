---
"@praxisjs/decorators": patch
---

`@Memo` falls back to object identity for non-JSON-serializable arguments (circular references, class instances). `@Debounce` cancels its pending timer on component unmount. `@Throttle` clamps negative `ms` values to `0`. `@Virtual` throws when `itemHeight` is `0` or negative.
