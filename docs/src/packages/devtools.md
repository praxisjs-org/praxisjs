# @praxisjs/devtools

::: warning Bugs and broken features
This package may have bugs or partially broken functionality. If you run into something, feel free to [open an issue or contribute on GitHub](https://github.com/praxisjs-org/praxisjs).
:::

::: code-group

```sh [npm]
npm install -D @praxisjs/devtools
```

```sh [pnpm]
pnpm add -D @praxisjs/devtools
```

```sh [yarn]
yarn add -D @praxisjs/devtools
```

:::

In-app developer tools for PraxisJS applications. Renders an interactive panel that shows live signal state, component performance metrics, and a chronological event timeline — all without leaving the browser.

## Setup

Call `DevTools.init()` in your entry point before mounting the application. The devtools panel will appear only in development.

```ts
// main.ts
import { DevTools } from '@praxisjs/devtools'

if (import.meta.env.DEV) {
  DevTools.init()
}
```

The panel mounts itself inside a Shadow DOM element appended to `<body>`, so it never conflicts with your application's styles.

---

## `DevTools`

The main singleton object that manages the devtools lifecycle.

### `DevTools.init(options?)`

Initialises the panel and renders it into the page. Calling `init()` more than once is a no-op.

```ts
DevTools.init({
  plugins: [SignalsPlugin, ComponentsPlugin, TimelinePlugin],
})
```

**Options:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `plugins` | `DevtoolsPlugin[]` | All built-in plugins | Override which plugin tabs are shown |

### `DevTools.registerPlugin(plugin)`

Adds a plugin at runtime after `init()` has already been called. If a plugin with the same `id` is already registered it is ignored.

```ts
DevTools.registerPlugin(MyCustomPlugin)
```

### `DevTools.registry`

Returns the global `Registry` instance used to record signals, components, and timeline events. Useful for integrating custom plugins.

```ts
const registry = DevTools.registry
```

---

## Built-in plugins

Three tabs are shown by default.

### `SignalsPlugin`

Lists every signal registered via `@Debug()` across all component instances. Shows the current value and the last 20 historical values for each signal.

### `ComponentsPlugin`

Lists every component instrumented by `@Trace()`. Displays render count, last render duration, mount time, current status (`mounted` / `unmounted`), and the full lifecycle event log.

### `TimelinePlugin`

Chronological log of all devtools events, capped at 200 entries. Each entry includes the event type, a human-readable label, and associated metadata.

**Event types:**

| Type | Triggered by |
|------|-------------|
| `signal:change` | A `@Debug()` signal value changes |
| `component:render` | A `@Trace()` component re-renders |
| `component:mount` | A `@Trace()` component's `onBeforeMount` fires |
| `component:unmount` | A `@Trace()` component's `onUnmount` fires |
| `lifecycle` | Any other lifecycle hook on a `@Trace()` component |
| `method:call` | A `@Debug()` method is invoked |

---

## Decorators

### `@Trace()`

Class decorator. Instruments a component to report render performance and lifecycle events to the devtools panel.

```ts
import { Trace } from '@praxisjs/devtools'
import { Component } from '@praxisjs/decorators'

@Trace()
@Component()
class Counter extends BaseComponent {
  render() {
    return <div>{this.count}</div>
  }
}
```

`@Trace()` must be placed **above** `@Component()` so it wraps the already-decorated class.

Hooks tracked: `onBeforeMount`, `onMount`, `onUnmount`, `onBeforeUpdate`, `onUpdate`, `onAfterUpdate`.

---

### `@Debug(options?)`

Property or method decorator. Tracks a `@State()` property, a `computed()` field, or a method in the **Signals** panel.

**Options:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `label` | `string` | Property / method name | Custom display name in the panel |

#### On a `@State()` property

Stack `@Debug()` above `@State()`:

```ts
import { Debug } from '@praxisjs/devtools'
import { State } from '@praxisjs/decorators'

@Trace()
@Component()
class Counter extends BaseComponent {
  @Debug()
  @State() count = 0
}
```

Every time `count` changes, the new value is recorded in the Signals tab with a full history trail.

#### On a `computed()` field

```ts
import { computed } from '@praxisjs/core'

@Trace()
@Component()
class Counter extends BaseComponent {
  @Debug()
  @State() count = 0

  @Debug({ label: 'doubled' })
  doubled = computed(() => this.count * 2)
}
```

#### On a method

```ts
@Trace()
@Component()
class Counter extends BaseComponent {
  @Debug()
  increment() {
    this.count++
  }
}
```

Method calls appear in the Timeline tab with arguments, return value, and execution duration.

---

## Custom plugins

A plugin is a plain object that satisfies the `DevtoolsPlugin` interface.

```ts
import type { DevtoolsPlugin } from '@praxisjs/devtools'

const MyPlugin: DevtoolsPlugin = {
  id: 'my-plugin',
  label: 'My Tab',

  setup(registry) {
    // Subscribe to registry events before the panel mounts.
    registry.bus.on('signal:changed', ({ entry }) => {
      console.log('signal changed', entry)
    })
  },

  component({ registry }) {
    return <div>Custom panel content</div>
  },
}

DevTools.registerPlugin(MyPlugin)
```

**`DevtoolsPlugin` interface:**

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | Unique identifier — used to prevent duplicate registration |
| `label` | `string` | Tab label shown in the panel |
| `setup` | `(registry: Registry) => void` | Optional. Called once on registration to subscribe to events |
| `component` | `FunctionComponent<{ registry: Registry }>` | PraxisJS function component rendered inside the tab |

---

## Types

```ts
import type {
  SignalEntry,
  ComponentEntry,
  TimelineEntry,
  HistoryEntry,
  LifecycleEvent,
  TimelineEventType,
} from '@praxisjs/devtools'
```

### `SignalEntry`

```ts
interface SignalEntry {
  id: string
  label: string
  componentId: string
  componentName: string
  value: unknown
  history: HistoryEntry[]   // last 20 values
  changedAt: number
}
```

### `HistoryEntry`

```ts
interface HistoryEntry {
  value: unknown
  timestamp: number
}
```

### `ComponentEntry`

```ts
interface ComponentEntry {
  id: string
  name: string
  renderCount: number
  lastRenderDuration: number
  mountedAt: number
  status: 'mounted' | 'unmounted'
  lifecycle: LifecycleEvent[]
}
```

### `LifecycleEvent`

```ts
interface LifecycleEvent {
  hook: string
  timestamp: number
}
```

### `TimelineEntry`

```ts
interface TimelineEntry {
  id: string
  type: TimelineEventType
  label: string
  timestamp: number
  data: Record<string, unknown>
}
```
