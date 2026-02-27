# Function Component Anatomy

A function component is a plain TypeScript function that receives props and returns a `VNode` or `null`. Unlike class components, it has no instance and no decorators — reactivity comes from signals, either created inside the function body or passed from outside.

## Overview

```tsx
import { signal, computed, resource } from '@verbose/core'
import { useRouter } from '@verbose/router'
import type { Children } from '@verbose/shared'

// ── External state ────────────────────────────────────────────────────────────
const query = signal('')
const debouncedQuery = debounced(query, 300)

// ── Props interface ───────────────────────────────────────────────────────────
interface SearchBarProps {
  placeholder?: string
  onSearch?: (q: string) => void
  children?: Children[]
}

// ── Component ─────────────────────────────────────────────────────────────────
function SearchBar({ placeholder = 'Search…', onSearch, children }: SearchBarProps) {
  const results = resource(async () => {
    if (!debouncedQuery()) return []
    const res = await fetch(`/api/search?q=${debouncedQuery()}`)
    return res.json()
  })

  return (
    <div class="search-bar">
      <input
        placeholder={placeholder}
        value={query}
        onInput={(e) => {
          query.set((e.target as HTMLInputElement).value)
          onSearch?.(query())
        }}
      />

      {() => results.pending() && <span class="spinner" />}

      <ul>
        {() => results.data()?.map(item => (
          <li key={item.id}>{item.title}</li>
        ))}
      </ul>

      {children}
    </div>
  )
}
```

---

## Each part explained

### 1. Props

Props are received as the first argument and are just a plain object. Destructure directly in the parameter list with optional defaults.

```tsx
interface CardProps {
  title: string
  elevated?: boolean
  onClose?: () => void
  children?: Children[]
}

function Card({ title, elevated = false, onClose, children }: CardProps) {
  return (
    <div class={`card ${elevated ? 'elevated' : ''}`}>
      <h2>{title}</h2>
      {children}
      {onClose && <button onClick={onClose}>✕</button>}
    </div>
  )
}
```

There is no `this.props` — everything comes directly from the parameter. Props are resolved once when the function is called.

---

### 2. Children

Children arrive as `props.children` (a `Children[]`). Render them anywhere in the output.

```tsx
interface PanelProps {
  children?: Children[]
}

function Panel({ children }: PanelProps) {
  return <section class="panel">{children}</section>
}

// Usage:
<Panel>
  <p>This is rendered inside the panel.</p>
</Panel>
```

---

### 3. Reactive output — reactive children

The function is called **once**. To make part of the output reactive, wrap it in an arrow function — the renderer tracks signal reads inside it and re-evaluates the subtree automatically.

```tsx
const count = signal(0)

function Counter() {
  return (
    <div>
      {/* Static — never updates */}
      <p>{count()}</p>

      {/* Reactive — updates whenever count changes */}
      {() => <p>{count()}</p>}
    </div>
  )
}
```

Signal values can also be passed directly as reactive prop values:

```tsx
const isDark = signal(false)

function ThemeButton() {
  return (
    <button
      class={() => isDark() ? 'btn-dark' : 'btn-light'}
      onClick={() => isDark.update(v => !v)}
    >
      Toggle
    </button>
  )
}
```

---

### 4. Local state — `signal()`

Because the renderer calls the function **exactly once**, any `signal()` created inside the body is instantiated once per usage and lives for as long as the component is in the DOM. Reactive children `() =>` capture the signal via closure, so every update is reflected automatically.

```tsx
import { signal } from '@verbose/core'

function Counter() {
  const count = signal(0)

  return (
    <div>
      {() => <p>Count: {count()}</p>}
      <button onClick={() => count.update(n => n + 1)}>+</button>
      <button onClick={() => count.update(n => n - 1)}>-</button>
    </div>
  )
}
```

Each usage of `<Counter />` gets its own independent signal — there is no sharing between instances.

```tsx
// Both counters are independent
<Counter />
<Counter />
```

`computed` and other reactive primitives follow the same rule:

```tsx
function TemperatureConverter() {
  const celsius = signal(0)
  const fahrenheit = computed(() => celsius() * 9 / 5 + 32)

  return (
    <div>
      <input
        type="number"
        value={celsius}
        onInput={e => celsius.set(Number((e.target as HTMLInputElement).value))}
      />
      {() => <p>{celsius()}°C = {fahrenheit()}°F</p>}
    </div>
  )
}
```

---

### 5. External state — signals

Function components have no instance state. Reactive state lives in signals defined outside the function — at module level, in a store, or passed as props.

```tsx
// module-level signal
const open = signal(false)

function Dropdown({ children }: { children?: Children[] }) {
  return (
    <div>
      <button onClick={() => open.update(v => !v)}>
        {() => open() ? 'Close' : 'Open'}
      </button>
      {() => open() && <div class="menu">{children}</div>}
    </div>
  )
}
```

For state that should not be shared between usages, create the signal in the **calling scope** and pass it as a prop:

```tsx
function App() {
  const open = signal(false)
  return <Dropdown open={open} />
}

function Dropdown({ open }: { open: Signal<boolean> }) {
  return (
    <div>
      <button onClick={() => open.update(v => !v)}>Menu</button>
      {() => open() && <ul>{/* items */}</ul>}
    </div>
  )
}
```

---

### 6. Async data — `resource`

`resource` can be used inside a function component. Define it outside if it should be shared, or inline if it's local to the rendered output.

```tsx
const userId = signal(1)

function UserCard() {
  const user = resource(async () => {
    const res = await fetch(`/api/users/${userId()}`)
    return res.json()
  })

  return () => {
    if (user.pending()) return <div class="skeleton" />
    if (user.error()) return <div class="error">Failed to load</div>
    return <h2>{user.data()?.name}</h2>
  }
}
```

> Note: the entire return is wrapped in `() =>` to make it reactive to `user.pending()`, `user.error()`, and `user.data()`.

---

### 7. Lifecycle

Function components support a subset of lifecycle hooks: `onBeforeMount`, `onMount`, `onUnmount`, and `onError`. Call them at the top level of the function body — the renderer collects them during the single invocation and wires them up automatically.

```tsx
import { onMount, onUnmount, onError } from '@verbose/core'
import { signal } from '@verbose/core'

function Clock() {
  const time = signal(new Date())

  onMount(() => {
    const id = setInterval(() => time.set(new Date()), 1000)
    onUnmount(() => clearInterval(id))
  })

  return () => <p>{time().toLocaleTimeString()}</p>
}
```

`onUnmount` can be called inside `onMount` to co-locate the teardown logic, exactly like in class components.

```tsx
function Logger() {
  onBeforeMount(() => {
    console.log('about to mount')
  })

  onError((err) => {
    console.error('render error:', err)
  })

  return <div />
}
```

| Hook | Available | Notes |
|---|---|---|
| `onBeforeMount` | ✅ | Runs before DOM insertion |
| `onMount` | ✅ | Runs after DOM insertion |
| `onUnmount` | ✅ | Runs on removal |
| `onError` | ✅ | Catches errors thrown during the function call |
| `onBeforeUpdate` / `onAfterUpdate` | ❌ | Function components are called once — there is no re-render to intercept |

---

### 8. Composing with utilities

Composables from `@verbose/composables` return signals/computed values that work as reactive props or reactive children.

```tsx
import { createRef, useElementSize } from '@verbose/composables'
import { spring } from '@verbose/motion'

function AnimatedBox() {
  const ref = createRef<HTMLDivElement>()
  const { width } = useElementSize(ref)
  const scale = spring(1)

  return (
    <div
      ref={ref}
      style={() => ({ transform: `scale(${scale.value()})` })}
      onMouseEnter={() => scale.target.set(1.05)}
      onMouseLeave={() => scale.target.set(1)}
    >
      {() => `Width: ${width()}px`}
    </div>
  )
}
```

---

## Data flow

```
      Parent
        │
      props
        │
        ▼
 ┌─────────────────┐
 │ FunctionComponent│
 │                 │
 │  signals ───────┼──► reactive children (() => ...)
 │  resource       │
 │  composables    │
 │                 │
 └────────┬────────┘
          │
    VNode (called once)
          │
          ▼
         DOM
          │
   callback props
          │
          ▼
        Parent
```

---

## Class vs Function components

| | Class component | Function component |
|---|---|---|
| Local state | `@State()` decorator | `signal()` inside the function |
| Shared state | Module-level signal / store | Module-level signal / store |
| Props | `@Prop()` + `this.props` | Destructured parameter |
| Lifecycle | `onMount`, `onUnmount`, etc. | `onMount`, `onUnmount`, `onBeforeMount`, `onError` |
| Slots | `@Slot()` decorator | `props.children` |
| Reactivity | Automatic re-render | Reactive children `() =>` |
| Commands | `@OnCommand()` | Not available |
| Re-renders | On signal or prop change | Never (called once) |

Use **function components** for presentational pieces with contained local state. Use **class components** when you need named slots, `@Watch`, `@Emit`, commands, or update-phase lifecycle hooks.
