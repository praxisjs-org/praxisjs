---
"@praxisjs/core": minor
"@praxisjs/runtime": patch
---

Add `untrack` utility and isolate component mounting from outer reactive contexts

**`@praxisjs/core`** exports two new functions from the public API:

- `peek(signal)` — reads a signal once without subscribing to it (was already in `/internal`, now public)
- `untrack(fn)` — runs a function with no active effect, suppressing all signal tracking inside it

```ts
import { peek, untrack } from '@praxisjs/core'

// read a signal without creating a dependency
if (peek(this.max) > peek(this.count)) {
  this.count++
}

// suppress tracking for a block of reads
const snapshot = untrack(() => this.totalCost)
```

**`@praxisjs/runtime`** — `mountComponent` now runs entirely inside `untrack`. This fixes a bug where components mounted inside a reactive context (e.g. the router) would accidentally subscribe the outer effect to any signal read during construction or render. The symptoms were:

- Eager reads like `description={this.count}` in JSX causing the router to re-mount the component on every state change, resetting state to its initial value
- `@Debug()` (and any decorator that reads a signal in its `addInitializer`) triggering the same re-mount loop

Reactive subscriptions set up via `{() => signal}` in JSX are unaffected — each arrow function creates its own isolated effect.
