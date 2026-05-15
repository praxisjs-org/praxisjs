---
title: Creating Composables
description: How to build custom composable classes in PraxisJS by extending Composable and using them with the @Compose decorator.
---

# Creating Composables

A composable encapsulates reactive state and browser behavior into a reusable class. Use `@Compose` to attach one to any component.

## The structure

Every composable extends `Composable` and implements `setup()`, which creates the reactive signals and returns them. Properties declared with `declare` provide TypeScript types — the actual reactive getters are wired up at runtime by `@Compose`.

```ts
import { signal } from '@praxisjs/core/internal'
import { Composable } from '@praxisjs/core'

export class NetworkStatus extends Composable {
  declare online: boolean  // typed property — set up reactively at runtime

  setup() {
    const online = signal(navigator.onLine)

    const onOnline = () => online.set(true)
    const onOffline = () => online.set(false)

    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)

    // store handlers for cleanup
    this._cleanup = () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
    }

    return { online }  // keys must match the declare properties
  }

  private _cleanup = () => {}

  onUnmount() {
    this._cleanup()
  }
}
```

Use it in a component:

```tsx
import { Compose } from '@praxisjs/decorators'
import { NetworkStatus } from './composables/network-status'

@Component()
class App extends StatefulComponent {
  @Compose(NetworkStatus)
  network!: NetworkStatus

  render() {
    return (
      <div>
        {() => this.network.online
          ? <p>Connected</p>
          : <p>No internet connection</p>
        }
      </div>
    )
  }
}
```

<StorybookLink story="guide-custom-composables-networkstatus--network-status-story" label="Live demo — NetworkStatus" />

---

## Constructor arguments

Add a constructor to accept configuration. Pass arguments to `@Compose` after the class:

```ts
export class PollingResource<T> extends Composable {
  declare data: T | null
  declare loading: boolean

  constructor(
    private readonly url: string,
    private readonly interval = 5000,
  ) {
    super()
  }

  setup() {
    const data = signal<T | null>(null)
    const loading = signal(true)

    const fetch = () => {
      window.fetch(this.url)
        .then(r => r.json() as T)
        .then(v => { data.set(v); loading.set(false) })
    }

    fetch()
    const timer = setInterval(fetch, this.interval)
    this._stop = () => clearInterval(timer)

    return { data, loading }
  }

  private _stop = () => {}

  onUnmount() { this._stop() }
}
```

```tsx
@Compose(PollingResource, '/api/status', 10_000)
status!: PollingResource<StatusData>
```

String arguments to `@Compose` resolve to instance properties — useful for passing reactive refs:

```tsx
containerRef = { current: null as HTMLElement | null }

@Compose(ElementSize, 'containerRef')
size!: ElementSize
```

### `getter(propName)` — live reactive source

When the composable's constructor expects a **callable source** (`Signal<T>` or `() => T`) rather than a snapshot, a string property name won't work — `@Compose` would pass the current value, not a function.

Use `getter()` to wrap a property name as a live getter:

```tsx
import { getter } from '@praxisjs/decorators'
```

```tsx
@State() postedAt = new Date()

// ✅ passes () => this.postedAt — TimeAgo calls it reactively
@Compose(TimeAgo, getter('postedAt'))
timeAgo!: TimeAgo

// ❌ would pass the current Date value — TimeAgo can't call a Date
@Compose(TimeAgo, 'postedAt')
```

`getter('propName')` is resolved at bind time: it returns `() => instance[propName]`, which reads the property on every call. If the property is backed by a `@State` signal or a computed getter, reads inside reactive effects will track it correctly.

```tsx
// works with @State signals:
@State() filter = ''
get filteredItems() { return ITEMS.filter(i => i.name.includes(this.filter)) }

@Compose(VirtualList, 'containerRef', getter('filteredItems'), 48)
virtual!: VirtualList<Item>
// When filter changes → filteredItems recomputes → VirtualList updates
```

| Form | What the composable receives | When to use |
|---|---|---|
| `'propName'` | Current value of `instance.propName` | Refs, plain objects, config |
| `getter('propName')` | `() => instance.propName` (callable) | Signals, computed getters, anything that must stay reactive |

---

## Derived state with `computed`

`setup()` can return signals, computeds, and plain functions — all are exposed as properties:

```ts
import { signal, computed } from '@praxisjs/core/internal'

export class Counter extends Composable {
  declare count: number
  declare doubled: number
  declare increment: () => void
  declare reset: () => void

  setup() {
    const count = signal(0)
    const doubled = computed(() => count() * 2)

    return {
      count,
      doubled,
      increment: () => count.update(n => n + 1),
      reset: () => count.set(0),
    }
  }
}
```

```tsx
@Compose(Counter)
counter!: Counter

render() {
  return (
    <div>
      <p>{() => this.counter.count} (×2 = {() => this.counter.doubled})</p>
      <button onClick={() => this.counter.increment()}>+1</button>
      <button onClick={() => this.counter.reset()}>Reset</button>
    </div>
  )
}
```

<StorybookLink story="guide-custom-composables-countercomposable--counter-story" label="Live demo — CounterComposable" />
<StorybookLink story="guide-custom-composables-pollingresource--polling-story" label="Live demo — PollingResource" />

<llm-only>
Composable facts:
- `declare propName: Type` is a TypeScript-only declaration — no runtime property is created. The actual reactive getter is defined by @Compose at bind time using the signals returned from setup().
- setup() must return an object whose keys match the declare'd properties. Values can be Signal, Computed, or plain values (including functions).
- Plain functions returned from setup() are exposed as regular methods on the composable view.
- onMount() and onUnmount() are called by the component lifecycle automatically — always clean up timers, event listeners, and observers in onUnmount().
- @Compose(Class, ...args) passes args to the constructor. String args are resolved to instance properties at bind time.
- getter('propName') from '@praxisjs/decorators' resolves to () => instance[propName] — use when the composable constructor needs a callable source (Signal or () => T), not a plain value snapshot. Plain string 'propName' passes the current value; getter('propName') passes a live function.
- The composable instance is created once per component instance — two components with @Compose(NetworkStatus) each get their own instance.
- Import Composable from '@praxisjs/core', signal/computed from '@praxisjs/core/internal', @Compose and getter from '@praxisjs/decorators'
Never hardcode package versions in package.json. Always install packages using @latest (e.g. `npm install @praxisjs/core@latest`) so the user gets the current release.
</llm-only>
