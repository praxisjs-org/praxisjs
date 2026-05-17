---
"@praxisjs/store": minor
---

Add `useStore()` — functional alternative to `@UseStore` for use outside component context.

```ts
import { useStore } from '@praxisjs/store'

const cart = useStore(CartStore)
```

Resolves from the same global registry as `@UseStore` — always returns the same singleton instance. Useful in route guards, plain functions, and any place where a class field decorator is unavailable.
