# @verbose/store

::: code-group

```sh [npm]
npm install @verbose/store
```

```sh [pnpm]
pnpm add @verbose/store
```

```sh [yarn]
yarn add @verbose/store
```

:::

Simple reactive state management. Stores are plain objects whose state properties become signals and whose methods can mutate state via `this`.

## `createStore<S, M>(definition)`

Creates a store from an object that mixes state and methods. Returns a factory function that returns the reactive proxy.

```ts
import { createStore } from '@verbose/store'

const useCounter = createStore({
  count: 0,
  step: 1,

  increment() {
    this.count += this.step
  },
  decrement() {
    this.count -= this.step
  },
  reset() {
    this.count = 0
  },
})

const counter = useCounter()

counter.count        // 0
counter.increment()
counter.count        // 1
```

### Proxy interface

| Member | Description |
|--------|-------------|
| State properties | Return current value; setting triggers reactivity |
| Methods | Available directly, `this` bound to state |
| `$state` | Raw state snapshot object |
| `$patch(partial)` | Merge a partial object into state |
| `$reset()` | Restore all state to initial values |
| `$subscribe(fn)` | Subscribe to any state change |

### `$patch`

```ts
counter.$patch({ count: 10, step: 2 })
```

### `$reset`

```ts
counter.$reset()
counter.count  // 0
```

### `$subscribe`

```ts
const unsub = counter.$subscribe((state) => {
  console.log('new count:', state.count)
})
```

---

## Class-based Stores

Use `@Store` and `@UseStore` for singleton stores accessed across components.

### `@Store()`

Registers the class as a singleton store in the global registry.

```ts
import { Store } from '@verbose/store'
import { State } from '@verbose/decorators'

@Store()
class AuthStore {
  @State() user: User | null = null
  @State() token: string | null = null

  login(user: User, token: string) {
    this.user = user
    this.token = token
  }

  logout() {
    this.user = null
    this.token = null
  }
}
```

### `@UseStore<T>(StoreConstructor)`

Lazily injects the singleton store instance into a component property.

```ts
import { UseStore } from '@verbose/store'
import { Component, BaseComponent } from '@verbose/decorators'

@Component()
class Header extends BaseComponent {
  @UseStore(AuthStore) auth!: AuthStore

  render() {
    return (
      <nav>
        {this.auth.user ? (
          <button onClick={() => this.auth.logout()}>Logout</button>
        ) : (
          <a href="/login">Login</a>
        )}
      </nav>
    )
  }
}
```

The instance is resolved once and cached per component.
