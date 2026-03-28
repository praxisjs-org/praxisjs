---
title: Store
description: "@praxisjs/store — class-based singleton stores with @Store and @UseStore. Define reactive state with @State, inject anywhere with @UseStore."
---

# Store

Class-based singleton state management. Define a store with `@Store`, inject it into any component with `@UseStore`.

::: code-group

```sh [npm]
npm install @praxisjs/store
```

```sh [pnpm]
pnpm add @praxisjs/store
```

```sh [yarn]
yarn add @praxisjs/store
```

```sh [bun]
bun add @praxisjs/store
```

:::

## `@Store()`

Registers a class as a global singleton store. Use `@State` for reactive properties and plain methods for mutations.

```ts
import { Store } from '@praxisjs/store'
import { State, Computed } from '@praxisjs/decorators'

@Store()
class CartStore {
  @State() items: Product[] = []
  @State() discount = 0

  @Computed()
  get total() {
    return this.items.reduce((sum, i) => sum + i.price, 0) * (1 - this.discount)
  }

  addItem(product: Product) {
    this.items = [...this.items, product]
  }

  removeItem(id: string) {
    this.items = this.items.filter(i => i.id !== id)
  }

  applyDiscount(rate: number) {
    this.discount = rate
  }
}
```

The class is instantiated once on first use and the same instance is shared across all consumers.

---

## `@UseStore(StoreClass)`

Injects the singleton store instance into a component field. The field is lazy — the store is created on first access.

```tsx
import { UseStore } from '@praxisjs/store'

@Component()
class CartButton extends StatefulComponent {
  @UseStore(CartStore) cart!: CartStore

  render() {
    return (
      <button onClick={() => this.cart.addItem(product)}>
        Add to cart ({() => this.cart.items.length})
      </button>
    )
  }
}
```

Any component that reads a reactive property from the store will update automatically when that property changes.

---

## Sharing state across components

Multiple components can inject the same store — they all share the same instance and react to the same state changes:

```tsx
@Component()
class CartSummary extends StatefulComponent {
  @UseStore(CartStore) cart!: CartStore

  render() {
    return (
      <div>
        <p>{() => this.cart.items.length} items</p>
        <p>Total: ${() => this.cart.total.toFixed(2)}</p>
      </div>
    )
  }
}

@Component()
class CheckoutPage extends StatefulComponent {
  @UseStore(CartStore) cart!: CartStore

  render() {
    return (
      <div>
        {() => this.cart.items.map(item => <CartItem item={item} />)}
        <button onClick={() => this.cart.applyDiscount(0.1)}>Apply 10% off</button>
      </div>
    )
  }
}
```

When `CartButton` calls `addItem()`, both `CartSummary` and `CheckoutPage` update automatically.

---

## Auth store example

```ts
@Store()
class AuthStore {
  @State() user: User | null = null

  @Computed()
  get isLoggedIn() { return this.user !== null }

  login(user: User) { this.user = user }
  logout() { this.user = null }
}

// In any component:
@UseStore(AuthStore) auth!: AuthStore

// Conditional render:
{() => this.auth.isLoggedIn
  ? <UserMenu user={this.auth.user!} />
  : <LoginButton />
}
```

<llm-only>
Store facts:
- @Store() registers the class constructor in a global storeRegistry Map
- @UseStore(StoreClass) lazily instantiates the store on first property access — cached per component instance in a WeakMap, but all components share the same store instance
- Store state uses @State from '@praxisjs/decorators' — same reactive signal system as components
- @Computed() works in stores exactly as in components
- Store methods are plain class methods — `this` refers to the store instance normally
- There is no createStore(), $patch(), $reset(), or $subscribe() — only @Store and @UseStore decorators
- Import: Store, UseStore from '@praxisjs/store'; State, Computed from '@praxisjs/decorators'
- The store singleton is created once globally — not per component, not per container
</llm-only>
