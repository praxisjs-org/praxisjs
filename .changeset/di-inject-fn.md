---
"@praxisjs/di": minor
---

Add `inject()` — functional alternative to `@Inject` for use outside component context.

```ts
import { inject } from '@praxisjs/di'

const auth = inject(AuthService)
```

Resolves from the same global container as `@Inject`. Useful in route guards, plain functions, and any place where a class instance is unavailable. Supports both class constructors and `Token` values.
