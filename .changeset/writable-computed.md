---
"@praxisjs/decorators": minor
"@praxisjs/core": minor
"@praxisjs/shared": minor
---

Add writable computed: `@Computed({ set })` and `writableComputed()`.

`@Computed` now accepts an optional `set` function. Assigning to the decorated property calls the setter with the component instance as `this`, letting you write back to the underlying signals while keeping the getter as a reactive cached `computed()`.

`writableComputed(getter, setter)` is also available from `@praxisjs/core/internal` for use in `Composable` patterns that don't use decorators. The `WritableComputed<T>` type is exported from `@praxisjs/shared`.
