---
title: Utility Decorators
description: General-purpose method decorators — @Bind, @Log, @Once, @Memo, and @Retry.
---

# Utility Decorators

## `@Bind()`

Automatically binds the method to the instance. Useful when passing methods as callbacks without arrow function wrappers.

```tsx
@Component()
class Panel extends StatefulComponent {
  @Bind()
  handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Escape') this.close()
  }

  onMount() {
    window.addEventListener('keydown', this.handleKeyDown)  // `this` is correct
  }

  onUnmount() {
    window.removeEventListener('keydown', this.handleKeyDown)
  }
}
```

---

## `@Log(options?)`

Logs method calls with arguments, return value, and execution time. Dev-only by default.

```tsx
@Log({ level: 'debug', time: true })
async fetchUser(id: number) {
  return fetch(`/api/users/${id}`).then(r => r.json())
}
```

| Option | Type | Default | Description |
|---|---|---|---|
| `level` | `'log' \| 'debug' \| 'warn'` | `'log'` | Console method |
| `args` | `boolean` | `true` | Log arguments |
| `result` | `boolean` | `true` | Log return value |
| `time` | `boolean` | `false` | Log execution time |
| `devOnly` | `boolean` | `true` | Skip in production |

---

## `@Once()`

Ensures the method runs at most once per instance. The result is cached and returned on subsequent calls.

```tsx
@Component()
class AppConfig extends StatefulComponent {
  @Once()
  async loadConfig() {
    const res = await fetch('/config.json')
    return res.json()  // only fetched once, even if called multiple times
  }
}
```

---

## `@Memo()`

Memoizes the method's return value per unique argument combination. Each unique set of arguments gets its own reactive `computed()` — so if the method reads any `@State` or `@Prop`, the cache updates automatically.

```tsx
@Component()
class PriceList extends StatefulComponent {
  @State() discount = 0

  @Memo()
  discountedPrice(price: number) {
    return price * (1 - this.discount)
  }

  render() {
    return (
      <ul>
        <li>$100 → {() => this.discountedPrice(100)}</li>
        <li>$200 → {() => this.discountedPrice(200)}</li>
      </ul>
    )
  }
}
```

When `this.discount` changes, both cached values recompute. Each argument combination has its own cache entry.

::: tip Argument caching
Arguments are serialized as a string cache key:
- Objects/null → `JSON.stringify` (falls back to object identity for non-serializable values such as circular references or class instances)
- Symbols → `symbol.toString()`
- Everything else → `String(value)`
:::

---

## `@Retry(maxAttempts, options?)`

Automatically retries an async method on failure.

```tsx
@Retry(3, { delay: 500, backoff: true })
async saveData(data: object) {
  const res = await fetch('/api/save', {
    method: 'POST',
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('Save failed')
}
```

| Option | Type | Description |
|---|---|---|
| `delay` | `number` | Wait (ms) before first retry |
| `backoff` | `boolean` | Double delay on each retry |
| `onRetry` | `(attempt, error) => void` | Called before each retry |

<llm-only>
@Memo() only works on StatefulComponent methods — it needs access to the component's reactive context to create computed() instances.
@Once() caches the RESULT (including Promises) — subsequent calls return the same Promise/value.
@Retry() wraps the method in try/catch and retries up to maxAttempts times, applying the delay between retries.
@Bind() is implemented via Object.defineProperty on the prototype to bind on first access.
</llm-only>
