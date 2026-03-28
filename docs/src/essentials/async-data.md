---
title: Async Data
description: "@Resource is PraxisJS's decorator for binding async data to a component field — it tracks loading, error, and data state reactively, with refetch, cancel, and mutate."
---

# Async Data

`@Resource` binds an async resource directly to a component field. It tracks loading, error, and data state reactively.

## Basic usage

```tsx
import { Component, State, Resource } from '@praxisjs/decorators'
import { StatefulComponent } from '@praxisjs/core'

@Component()
class UserProfile extends StatefulComponent {
  @State() userId = 1

  @Resource(() => fetch(`/api/users/${this.userId}`).then(r => r.json()))
  user!: ResourceInstance<User>

  render() {
    return (
      <div>
        {() => this.user.pending() && <p>Loading...</p>}
        {() => this.user.error() && <p>Error: {this.user.error()?.message}</p>}
        {() => this.user.data() && <p>Hello, {this.user.data()!.name}</p>}
      </div>
    )
  }
}
```

The resource **automatically re-runs** when `this.userId` changes, because the fetcher reads a signal.

---

## Resource state

| Property | Type | Description |
|---|---|---|
| `.data()` | `T \| null` | The resolved value |
| `.pending()` | `boolean` | `true` while the fetch is in-flight |
| `.error()` | `unknown` | The last error, or `null` |
| `.status()` | `'idle' \| 'pending' \| 'success' \| 'error'` | Full status |

---

## Options

```tsx
@Resource(() => api.getUsers(), {
  initialData: [],       // value of .data() before first fetch
  immediate: false,      // don't fetch automatically (default: true)
  keepPreviousData: true // keep old data while refetching
})
users!: ResourceInstance<User[]>
```

---

## Refetch, cancel, and mutate

```tsx
// Manually trigger a new fetch
<button onClick={() => this.user.refetch()}>Refresh</button>

// Cancel an in-flight request
<button onClick={() => this.user.cancel()}>Cancel</button>
```

**Optimistic updates** with `mutate()`:

```tsx
async save(newName: string) {
  // Update UI immediately
  this.user.mutate({ ...this.user.data()!, name: newName })

  // Then persist and confirm
  await api.updateUser({ name: newName })
  this.user.refetch()
}
```

---

## Reactive dependencies

Any signal read inside the fetcher is a dependency — when it changes, the resource cancels any pending request and starts a new one:

```tsx
@State() page = 1
@State() search = ''

@Resource(() =>
  fetch(`/api/search?q=${this.search}&page=${this.page}`).then(r => r.json())
)
results!: ResourceInstance<SearchResult[]>
```

<llm-only>
@Resource facts:
- Imported from '@praxisjs/decorators' along with ResourceInstance type
- The fetcher function is a reactive effect — any signal read inside it creates a dependency
- When a dependency changes, the previous request is cancelled (via a runId check) and a new one starts
- immediate: false starts in 'idle' status — call .refetch() manually to trigger the first fetch
- .pending() is true only during the fetch, not during idle
- .mutate(value) sets .data() immediately and transitions to 'success' without a fetch — used for optimistic updates
- .cancel() increments the internal runId, causing any in-flight .then/.catch to be ignored, and sets status back to 'idle'
- ResourceInstance<T> type is exported from '@praxisjs/decorators'
- The field must be declared with `!` (definite assignment assertion) since @Resource sets it up at initialization time
</llm-only>
