---
"@praxisjs/decorators": minor
---

Add `@Ref<T>()` decorator, `createRef<T>()` helper, and `Ref<T>` type for typed DOM element refs.

Replaces the manual `{ current: null as T | null }` field with a decorator that produces a callable ref — pass it directly to the JSX `ref` prop and read `.current` to access the element. Works transparently with `@Compose` via the existing string-name resolution. Use `createRef<T>()` for module-level refs outside of classes.
