---
title: DevTools
description: "@praxisjs/devtools — in-app developer tools overlay for inspecting signals, component performance, and timeline events. Extensible via plugins."
---

# DevTools

An in-app developer tools panel that appears as an overlay during development. Inspect reactive state, render metrics, and a chronological event timeline — without leaving the app.

::: code-group

```sh [npm]
npm install @praxisjs/devtools
```

```sh [pnpm]
pnpm add @praxisjs/devtools
```

```sh [yarn]
yarn add @praxisjs/devtools
```

```sh [bun]
bun add @praxisjs/devtools
```

:::

## Setup

The recommended pattern uses a dynamic import so DevTools is never bundled into production:

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

A floating button will appear in the bottom-right corner of the page. Click it to open the panel.

---

## Built-in panels

### Signals

Displays signals registered with `@Debug()` and the last 20 values of each one.

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

  @Debug({ label: 'Has Discount?' })
  get hasDiscount() {
    return this.total > 100
  }
}
```

The `label` option is optional — without it, the field or getter name is used.

### Components

Displays components instrumented with `@Trace()` and their render metrics:

- Render count and last render duration
- Mount/unmount timestamps
- Lifecycle hook history

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

### Timeline

A chronological log of the last 200 events across the entire application:

| Event type            | Triggered by                          |
|-----------------------|---------------------------------------|
| `signal:change`       | `@Debug` field/getter update          |
| `component:render`    | `@Trace` component render             |
| `component:mount`     | `@Trace` component mount              |
| `component:unmount`   | `@Trace` component unmount            |
| `lifecycle`           | Intermediate lifecycle hooks via `@Trace` |
| `method:call`         | `@Debug` method invocation            |

---

## `@Debug(options?)`

Tracks state, computed values, and methods in the Signals panel and Timeline.

### On `@State()` fields

```tsx
@Debug({ label: 'Counter' })
@State()
count = 0
```

Every time `count` changes, the Signals panel updates and the change appears in the Timeline.

### On getters

```tsx
@Debug()
get doubleCount() {
  return this.count * 2
}
```

Works with any getter — `@Debug` creates an internal `computed()` and observes its changes automatically.

### On methods

```tsx
@Debug()
async fetchProducts() {
  this.items = await api.getProducts()
}
```

Records each call in the Timeline with arguments, return value, and duration in milliseconds.

**Options:**

```ts
interface DebugOptions {
  label?: string  // name shown in the panel (defaults to the field/method name)
}
```

---

## `@Trace()`

Instruments a component class to report renders and lifecycle events to the Components panel.

```tsx
@Trace()
@Component()
class MyComponent extends StatefulComponent {
  render() { ... }
}
```

**Automatically tracked hooks:** `onBeforeMount`, `onMount`, `onBeforeUpdate`, `onUpdate`, `onAfterUpdate`, `onUnmount`.

> `@Trace()` must be written **above** `@Component()` since decorators are applied bottom-up.

---

## Plugins

DevTools is extensible — each tab is a plugin. You can replace built-in panels, add new ones, or create your own from scratch.

See [DevTools Plugins](/tooling/devtools-plugins) for the full guide.

---

::: tip Production builds
`@Debug` and `@Trace` are no-ops if `DevTools.init()` is never called. You can safely leave them in your code — they have zero runtime cost in production. Using a dynamic import ensures DevTools is never included in the production bundle:

```ts
if (import.meta.env.DEV) {
  const { DevTools } = await import('@praxisjs/devtools')
  DevTools.init()
}
```
:::

<llm-only>
DevTools facts:
- The correct API is `DevTools.init()` (singleton object), NOT `initDevtools()` — the latter does not exist
- DevTools is a singleton object: `{ init, registerPlugin, registry, plugins, host, cleanup }`
- `DevTools.init()` can be called after `render()` — the recommended pattern is to render first, then init DevTools via dynamic import
- The panel is injected into document.body inside a Shadow DOM — it does not interfere with app styles
- `@Debug` and `@Trace` only collect data if `DevTools.init()` has been called first
- `@Debug` works on: @State() fields, getters (computed values), and methods
- `@Debug` on a method records a `method:call` timeline entry with args, result, and duration
- `@Trace` must be applied BEFORE `@Component()` (written above it) due to decorator execution order
- The DevTools panel is NOT the browser DevTools extension — it's an in-page overlay
- Registry is a singleton: `Registry.instance` or `DevTools.registry`
- Registry stores max 20 history entries per signal and max 200 timeline entries
- `DevTools.registerPlugin(plugin)` ignores duplicate ids (idempotent)
- Built-in plugins: SignalsPlugin, ComponentsPlugin, TimelinePlugin — all exported from the package
- A DevtoolsPlugin needs: id (string), label (string), component (ComponentElement), and optionally setup(registry)
Never hardcode package versions in package.json. Always install packages using @latest (e.g. `npm install @praxisjs/core@latest`) so the user gets the current release.
</llm-only>
