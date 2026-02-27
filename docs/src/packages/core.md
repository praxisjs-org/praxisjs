# @verbose/core

::: code-group

```sh [npm]
npm install @verbose/core
```

```sh [pnpm]
pnpm add @verbose/core
```

```sh [yarn]
yarn add @verbose/core
```

:::

Reactive primitives that power the entire framework. All state, derivations, and side effects flow through signals.

## Signals

### `signal<T>(initialValue)`

Creates a reactive value. When the value changes, all subscribers and effects that read it are automatically re-executed.

```ts
import { signal } from '@verbose/core'

const count = signal(0)

count.value          // 0
count.set(1)         // set directly
count.update(n => n + 1)  // update from previous value
count.subscribe(v => console.log(v))  // listen for changes
```

### `computed<T>(fn)`

Creates a derived value that recalculates lazily whenever its signal dependencies change. The result is cached between reads.

```ts
import { signal, computed } from '@verbose/core'

const count = signal(2)
const doubled = computed(() => count.value * 2)

doubled.value  // 4
count.set(5)
doubled.value  // 10
```

### `effect(fn)`

Runs a function immediately and re-runs it whenever any signal read inside it changes. The function can return a cleanup callback.

```ts
import { signal, effect } from '@verbose/core'

const name = signal('Alice')

const stop = effect(() => {
  console.log('Hello,', name.value)
  return () => console.log('cleanup')
})

name.set('Bob')  // logs "Hello, Bob"
stop()           // stops the effect
```

### `batch(fn)`

Defers all signal notifications until the function completes. Useful when updating multiple signals that drive the same UI.

```ts
import { signal, batch } from '@verbose/core'

const x = signal(0)
const y = signal(0)

batch(() => {
  x.set(10)
  y.set(20)
  // subscribers notified once here, not twice
})
```

---

## Persistence

### `persistedSignal<T>(key, initial, options?)`

A signal that automatically reads from and writes to `localStorage`. Updates sync across browser tabs.

```ts
import { persistedSignal } from '@verbose/core'

const theme = persistedSignal('theme', 'light')

theme.set('dark')
// localStorage.getItem('theme') === '"dark"'
```

**Options:**

| Option | Type | Description |
|--------|------|-------------|
| `serialize` | `(v: T) => string` | Custom serializer (default: `JSON.stringify`) |
| `deserialize` | `(s: string) => T` | Custom deserializer (default: `JSON.parse`) |
| `syncTabs` | `boolean` | Listen to `storage` events from other tabs (default: `true`) |

---

## Utilities

### `peek(source)`

Reads a signal or computed value **without registering a reactive dependency**. Equivalent to Solid's `untracked()`.

Use this when you need the current value of a signal inside an effect or `render()` but deliberately do **not** want that signal to trigger a re-run when it changes.

```ts
import { signal, effect, peek } from '@verbose/core'

const count = signal(0)
const multiplier = signal(2)

effect(() => {
  // Re-runs only when `count` changes.
  // `multiplier` is read without creating a dependency.
  const m = peek(multiplier)
  console.log(count() * m)
})

multiplier.set(10)  // effect does NOT re-run
count.set(5)        // effect re-runs: logs 5 * 10 = 50
```

Works with any callable: `Signal`, `Computed`, or a plain getter function.

```ts
const doubled = computed(() => count() * 2)

// Read computed value without subscribing to it
const snapshot = peek(doubled)
```

### `when(source, fn)`

Executes `fn` exactly once, the first time `source` becomes truthy. Returns a cancel function.

```ts
import { signal, when } from '@verbose/core'

const ready = signal(false)

const cancel = when(ready, () => {
  console.log('ready!')
})

ready.set(true)  // logs "ready!" once
```

### `until(source)`

Returns a `Promise` that resolves with the first truthy value from `source`.

```ts
import { signal, until } from '@verbose/core'

const data = signal<string | null>(null)

const value = await until(data)
console.log(value)  // string (never null)
```

### `debounced(source, ms)`

Creates a derived signal that only updates after `ms` milliseconds of inactivity from `source`.

```ts
import { signal, debounced } from '@verbose/core'

const input = signal('')
const debouncedInput = debounced(input, 300)

// debouncedInput.value updates 300ms after input stops changing
```

### `history(source, limit?)`

Maintains an undo/redo history for a signal. Defaults to 50 entries.

```ts
import { signal, history } from '@verbose/core'

const text = signal('hello')
const h = history(text)

text.set('world')
text.set('!')

h.canUndo.value  // true
h.undo()
text.value       // 'world'
h.redo()
text.value       // '!'
h.values.value   // ['hello', 'world', '!']
h.clear()
```

**Returned object:**

| Property | Type | Description |
|----------|------|-------------|
| `values` | `Computed<T[]>` | Full history array |
| `current` | `Computed<T>` | Current value |
| `canUndo` | `Computed<boolean>` | Whether undo is available |
| `canRedo` | `Computed<boolean>` | Whether redo is available |
| `undo()` | `() => void` | Go back one step |
| `redo()` | `() => void` | Go forward one step |
| `clear()` | `() => void` | Reset history |

---

## Async Resources

### `resource<T>(fetcher, options?)`

Manages async data fetching. Automatically re-fetches when any signal read inside `fetcher` changes.

```ts
import { signal, resource } from '@verbose/core'

const userId = signal(1)

const user = resource(async () => {
  const res = await fetch(`/api/users/${userId.value}`)
  return res.json()
})

user.pending.value  // true while fetching
user.data.value     // resolved data
user.error.value    // Error if rejected

user.refetch()      // manually re-trigger
user.cancel()       // cancel in-flight request
user.mutate({ name: 'Alice' })  // optimistic update
```

**Options:**

| Option | Type | Description |
|--------|------|-------------|
| `initialData` | `T` | Data before first fetch |
| `immediate` | `boolean` | Fetch on creation (default: `true`) |
| `keepPreviousData` | `boolean` | Keep old data while refetching |

**Returned object:**

| Property | Type | Description |
|----------|------|-------------|
| `data` | `Computed<T \| null>` | Resolved value |
| `pending` | `Computed<boolean>` | Fetch in progress |
| `error` | `Computed<unknown>` | Last error |
| `status` | `Computed<'idle' \| 'pending' \| 'success' \| 'error'>` | Current state |
| `refetch()` | `() => void` | Re-run the fetcher |
| `cancel()` | `() => void` | Abort current fetch |
| `mutate(data)` | `(T) => void` | Directly set data |

### `createResource<P, T>(param, fetcher, options?)`

Convenience wrapper for a resource driven by a single parameter signal.

```ts
import { signal, createResource } from '@verbose/core'

const userId = signal(1)

const user = createResource(userId, async (id) => {
  const res = await fetch(`/api/users/${id}`)
  return res.json()
})
```

Equivalent to `resource(() => fetcher(param()))` but with cleaner intent.

---

## Lifecycle Hooks

These hooks are available **only inside function components**. The renderer collects them during the single function invocation and wires them into the component's lifecycle automatically.

### `onBeforeMount(fn)`

Runs synchronously before the returned VNode is inserted into the DOM.

```ts
import { onBeforeMount } from '@verbose/core'

function Banner() {
  onBeforeMount(() => {
    console.log('about to mount')
  })
  return <div class="banner" />
}
```

### `onMount(fn)`

Runs after the component's DOM nodes have been inserted. Equivalent to `onMount()` on a class component.

```ts
import { onMount, onUnmount, signal } from '@verbose/core'

function Clock() {
  const time = signal(new Date())

  onMount(() => {
    const id = setInterval(() => time.set(new Date()), 1000)
    onUnmount(() => clearInterval(id))
  })

  return () => <p>{time().toLocaleTimeString()}</p>
}
```

`onUnmount` can be called inside `onMount` to co-locate setup and teardown.

### `onUnmount(fn)`

Runs when the component is removed from the DOM. Typically used for cleanup.

```ts
import { onUnmount } from '@verbose/core'

function Tracker() {
  onUnmount(() => {
    analytics.track('component_removed')
  })
  return <div />
}
```

### `onError(fn)`

Called if an error is thrown during the function body execution. Receives the caught error.

```ts
import { onError } from '@verbose/core'

function Risky() {
  onError((err) => {
    console.error('render failed:', err)
  })
  return <div />
}
```

> These hooks have no effect when called outside of a function component — a warning is emitted in development.
