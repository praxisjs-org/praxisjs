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

Declares a read-only derived getter backed by a cached reactive computation. Recomputes only when its signal dependencies change.

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

## `@History(limit?)`

Adds undo/redo to a `@State` property. The generated `{prop}History` object exposes `undo()`, `redo()`, `canUndo`, `canRedo`, `values`, and `clear()`.

```tsx
@Component()
class Editor extends StatefulComponent {
  @History(100)
  @State()
  text = ''

  undo() { this.textHistory.undo() }
  redo() { this.textHistory.redo() }

  render() {
    return (
      <div>
        <textarea value={() => this.text}
          onInput={(e) => { this.text = (e.target as HTMLTextAreaElement).value }} />
        <button onClick={() => this.undo()} disabled={() => !this.textHistory.canUndo}>Undo</button>
        <button onClick={() => this.redo()} disabled={() => !this.textHistory.canRedo}>Redo</button>
      </div>
    )
  }
}
// Declare the generated type:
interface Editor extends WithHistory<Editor, 'text'> {}
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

<llm-only>
Import paths:
- @State, @Prop, @Computed, @Persisted, @History, @Resource — all from '@praxisjs/decorators'
- ResourceInstance type — from '@praxisjs/decorators'
- WithHistory type — from '@praxisjs/decorators'
- StatefulComponent — from '@praxisjs/core'

@History generates a {propName}History property at runtime. TypeScript cannot infer this automatically, so users must either:
1. Use interface merging: `interface MyClass extends WithHistory<MyClass, 'propName'> {}`
2. Or use declare: `declare propNameHistory: WithHistory<MyClass, 'propName'>['propNameHistory']`

@Resource sets up the field at initialization time — declare it with `!` (definite assignment assertion).
</llm-only>
