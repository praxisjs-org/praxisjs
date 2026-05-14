---
title: State & Props
description: Decorators for managing reactive state and external props — @State, @Prop, @Computed, @Persisted, @History, and @Resource.
---

# State & Props

## `@State()`

Declares a reactive property backed by a signal. Reading it inside an arrow function in JSX subscribes to updates.

```tsx
@Component()
class Toggle extends StatefulComponent {
  @State() open = false

  render() {
    return (
      <button onClick={() => { this.open = !this.open }}>
        {() => this.open ? 'Close' : 'Open'}
      </button>
    )
  }
}
```

::: warning Arrays and objects
`@State` tracks reference changes only. Mutate with new references:

```ts
// ✅
this.items = [...this.items, newItem]
this.config = { ...this.config, theme: 'dark' }

// ❌ won't trigger updates
this.items.push(newItem)
this.config.theme = 'dark'
```
:::

---

## `@Prop()`

Declares an external prop. The initialized value is the default when the parent doesn't pass one.

```tsx
@Component()
class Button extends StatefulComponent {
  @Prop() label = 'Click me'
  @Prop() disabled = false

  render() {
    return (
      <button disabled={() => this.disabled}>
        {() => this.label}
      </button>
    )
  }
}

// Usage:
<Button label="Submit" disabled={false} />
```

---

## `@Computed()`

Declares a read-only derived getter backed by a cached reactive computation. Recomputes only when its signal dependencies change. When multiple dependencies change in the same synchronous block, subscribers are notified **once** with the final value.

```tsx
@Component()
class Cart extends StatefulComponent {
  @State() items: { name: string; price: number }[] = []

  @Computed()
  get total() {
    return this.items.reduce((sum, i) => sum + i.price, 0)
  }

  render() {
    return <p>Total: ${() => this.total}</p>
  }
}
```

---

## `@Persisted(key?, options?)`

Like `@State`, but the value is persisted to `localStorage` and survives page reloads. `key` defaults to the property name.

```tsx
@Component()
class Settings extends StatefulComponent {
  @Persisted() theme = 'light'
  @Persisted('app:fontSize') fontSize = 14

  render() {
    return (
      <select value={() => this.theme} onChange={(e) => {
        this.theme = (e.target as HTMLSelectElement).value
      }}>
        <option value="light">Light</option>
        <option value="dark">Dark</option>
      </select>
    )
  }
}
```

Setting the value to `null` or `undefined` removes the entry from localStorage.

| Option | Type | Default | Description |
|---|---|---|---|
| `serialize` | `(v: T) => string` | `JSON.stringify` | Custom serializer |
| `deserialize` | `(s: string) => T` | `JSON.parse` | Custom deserializer |
| `syncTabs` | `boolean` | `true` | Sync across browser tabs |

---

## `@History(fieldName, limit?)`

Adds undo/redo to a `@State` property. Declare a separate field decorated with `@History('fieldName')` and type it with `HistoryOf<Class, 'fieldName'>` for full intellisense.

```tsx
import { History, HistoryOf } from '@praxisjs/decorators'

@Component()
class Editor extends StatefulComponent {
  @State()
  text = ''

  @History('text', 100)
  textHistory!: HistoryOf<Editor, 'text'>
  // textHistory.undo()    ✓
  // textHistory.redo()    ✓
  // textHistory.canUndo() ✓
  // textHistory.canRedo() ✓

  render() {
    return (
      <div>
        <textarea value={() => this.text}
          onInput={(e) => { this.text = (e.target as HTMLTextAreaElement).value }} />
        <button onClick={() => this.textHistory.undo()} disabled={() => !this.textHistory.canUndo()}>Undo</button>
        <button onClick={() => this.textHistory.redo()} disabled={() => !this.textHistory.canRedo()}>Redo</button>
      </div>
    )
  }
}
```

---

## `@Resource(fetcher, options?)`

Binds an async resource to the field. Automatically re-fetches when any signal read inside the fetcher changes.

```tsx
@Component()
class PostList extends StatefulComponent {
  @State() page = 1

  @Resource(() => fetch(`/api/posts?page=${this.page}`).then(r => r.json()))
  posts!: ResourceInstance<Post[]>

  render() {
    return (
      <div>
        {() => this.posts.pending() && <Spinner />}
        {() => this.posts.data()?.map(p => <PostCard post={p} />)}
        <button onClick={() => this.page++}>Next page</button>
      </div>
    )
  }
}
```

| Option | Default | Description |
|---|---|---|
| `immediate` | `true` | Fetch on initialization |
| `initialData` | `null` | Value of `.data()` before first fetch |
| `keepPreviousData` | `false` | Keep old data while refetching |

The field exposes `.data()`, `.pending()`, `.error()`, `.status()`, `.refetch()`, `.cancel()`, and `.mutate(value)`.

→ See [Async Data](/essentials/async-data) for full details.

---

## `@Synced(channelName?)`

Like `@State`, but the value is synced in real-time across all open browser tabs via `BroadcastChannel`. `channelName` defaults to the field name.

```tsx
@Component()
class CartButton extends StatefulComponent {
  @Synced('cart') items: Product[] = []

  render() {
    return (
      <button onClick={() => { this.items = [...this.items, newItem] }}>
        Cart ({() => this.items.length})
      </button>
    )
  }
}
```

When any tab writes to `this.items`, all other open tabs update automatically. Combine with `@Persisted` for both persistence and live sync:

```tsx
@Synced('cart')
@Persisted('cart')
items: Product[] = []
```

::: warning
Serialization uses `JSON.stringify`/`JSON.parse`. Values that are not JSON-serializable (functions, class instances, `undefined`) are not supported.
:::

---

## `@DeepState()`

Like `@State`, but uses a deep `Proxy` so nested mutations are reactive without needing to create new references.

```tsx
@Component()
class ThemeEditor extends StatefulComponent {
  @DeepState() config = { theme: { mode: 'light', accent: '#0070f3' }, fontSize: 14 }

  render() {
    return (
      <div>
        <p>Mode: {() => this.config.theme.mode}</p>
        <button onClick={() => { this.config.theme.mode = 'dark' }}>Dark</button>
        <button onClick={() => { this.config.fontSize++ }}>Larger</button>
      </div>
    )
  }
}
```

Any mutation at any depth — including `push`, index assignment, and property deletion — triggers reactive updates.

::: tip When to use @DeepState vs @State
- Use `@State` (preferred) when you control the shape and can replace references: `this.items = [...this.items, x]`
- Use `@DeepState` when working with deeply nested structures where immutable patterns are too verbose

`@DeepState` is coarse-grained: **any** nested mutation re-runs all effects that read the field, regardless of which property changed.
:::

::: warning Limitations
`Map`, `Set`, and class instances are not tracked deeply — only plain objects and arrays. Mutations via their own methods (e.g. `map.set(k, v)`) will not trigger reactivity.
:::

<llm-only>
Import paths:
- @State, @Prop, @Computed, @Persisted, @History, @Resource, @Synced, @DeepState — all from '@praxisjs/decorators'
- ResourceInstance type — from '@praxisjs/decorators'
- HistoryOf type — from '@praxisjs/decorators'
- StatefulComponent — from '@praxisjs/core'

@History(fieldName, limit?) decorates a separate field (not the state field itself). The first argument is the name of the @State field to track. Type the decorated field as HistoryOf<ClassName, 'fieldName'> for full intellisense. No interface merging or declare workarounds needed.

@Resource sets up the field at initialization time — declare it with `!` (definite assignment assertion).
Never hardcode package versions in package.json. Always install packages using @latest (e.g. `npm install @praxisjs/core@latest`) so the user gets the current release.
</llm-only>
