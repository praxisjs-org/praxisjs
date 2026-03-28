---
title: DX Decorators
description: Developer experience decorators — @Debug to expose signals, computed values, and methods in DevTools, and @Trace to instrument component performance.
---

# DX Decorators

Decorators that instrument your code for the [DevTools](/tooling/devtools) panel. They are no-ops unless `DevTools.init()` has been called, so they are safe to leave in production code.

Both decorators are exported from `@praxisjs/devtools`:

```sh
npm install @praxisjs/devtools
```

```ts
import { Debug, Trace } from '@praxisjs/devtools'
```

---

## `@Debug(options?)`

Exposes a field, getter, or method in the DevTools panel. Depending on what it decorates, it feeds the **Signals** panel or the **Timeline**.

### On `@State()` fields

The most common use case. Every value change is recorded in the Signals panel with a 20-entry history.

```tsx
import { Component, State } from '@praxisjs/decorators'
import { Debug } from '@praxisjs/devtools'
import { StatefulComponent } from '@praxisjs/core'

@Component()
class CartStore extends StatefulComponent {
  @Debug({ label: 'Cart Items' })
  @State()
  items: Product[] = []

  @Debug()
  @State()
  total = 0
}
```

> `@Debug` must be written **above** `@State()` — decorators are applied bottom-up, so `@State` runs first to set up the reactive accessor, then `@Debug` wraps it.

### On getters

Tracks any computed value derived from reactive state.

```tsx
@Component()
class CartStore extends StatefulComponent {
  @State() total = 0

  @Debug({ label: 'Has Discount?' })
  get hasDiscount() {
    return this.total > 100
  }
}
```

`@Debug` creates an internal `computed()` that observes the getter and records each change to the Signals panel.

### On methods

Records every method call in the **Timeline** with arguments, return value, and duration in milliseconds.

```tsx
@Component()
class CartStore extends StatefulComponent {
  @Debug()
  async fetchProducts() {
    this.items = await api.getProducts()
  }

  @Debug({ label: 'Apply Coupon' })
  applyCoupon(code: string) {
    // ...
  }
}
```

**Options:**

| Option  | Type     | Default           | Description                         |
|---------|----------|-------------------|-------------------------------------|
| `label` | `string` | field/method name | Display name shown in the panel     |

---

## `@Trace()`

Instruments a component class to report render performance and lifecycle events to the **Components** and **Timeline** panels.

```tsx
import { Component, State } from '@praxisjs/decorators'
import { Trace } from '@praxisjs/devtools'
import { StatefulComponent } from '@praxisjs/core'

@Trace()
@Component()
class DataGrid extends StatefulComponent {
  @State() rows: Row[] = []

  render() {
    return <table>{/* ... */}</table>
  }
}
```

> `@Trace()` must be written **above** `@Component()` — decorators are applied bottom-up.

**What gets recorded:**

| Data point            | Where it appears          |
|-----------------------|---------------------------|
| Render duration (ms)  | Components panel          |
| Total render count    | Components panel          |
| Mount timestamp       | Components panel          |
| `onBeforeMount`       | Timeline                  |
| `onMount`             | Timeline                  |
| `onBeforeUpdate`      | Timeline                  |
| `onUpdate`            | Timeline                  |
| `onAfterUpdate`       | Timeline                  |
| `onUnmount`           | Timeline                  |

---

## Setup

Both decorators are no-ops until `DevTools.init()` is called. The recommended pattern uses a dynamic import so DevTools is never bundled into production:

```ts
// src/main.ts
import { render } from '@praxisjs/runtime'
import { App } from './app'

render(() => <App />, document.getElementById('app')!)

if (import.meta.env.DEV) {
  const { DevTools } = await import('@praxisjs/devtools')
  DevTools.init()
}
```

See [DevTools](/tooling/devtools) for the full setup guide, plugin API, and how to extend the panel.

<llm-only>
DX decorator facts:
- @Debug and @Trace are exported from @praxisjs/devtools, NOT from @praxisjs/decorators
- The correct init call is DevTools.init(), NOT initDevtools() — the latter does not exist
- @Debug and @Trace are no-ops unless DevTools.init() has been called — it can be called after render()
- @Debug on a @State() field: must be written above @State() so @State runs first
- @Debug on a getter: creates an internal computed() to observe changes
- @Debug on a method: records to Timeline as method:call with args, result, duration
- @Trace must be written above @Component() due to decorator execution order (bottom-up)
- @Trace tracks these hooks automatically: onBeforeMount, onMount, onBeforeUpdate, onUpdate, onAfterUpdate, onUnmount
- Registry stores max 20 history entries per signal and max 200 timeline entries
</llm-only>
