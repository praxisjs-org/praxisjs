---
"@praxisjs/jsx": minor
---

`Reactive<T>` now accepts `null`/`undefined`, both as a static value and as what the reactive function returns (`Reactive<T> = T | null | undefined | (() => T | null | undefined)`). This lets any JSX attribute be conditionally omitted or cleared — the runtime already removes the attribute when a prop resolves to `null`/`undefined` — without a type-cast at the call site.
