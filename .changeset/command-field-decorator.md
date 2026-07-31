---
"@praxisjs/decorators": minor
---

Add `@Command<T>()` field decorator — a decorator-syntax alternative to calling `createCommand()` as a plain field initializer:

```tsx
@Command() play!: Command
@Command() pause!: Command
@Command<number>() seek!: Command<number>
```

`Command<T>` is both the decorator function and the type annotation, matching the `@Ref<T>()` pattern. Each decorated field gets its own `Command` instance, created once per component instance. Calling `createCommand()` directly still works and is unaffected.
