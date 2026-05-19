---
title: Decorator Reference
date: 2026-05-18
description: A quick reference for the most commonly used PraxisJS decorators.
draft: false
tags: [decorators, reference]
---

# Decorator Reference

PraxisJS is decorator-first. Here are the most commonly used ones.

## Component decorators

| Decorator | Purpose |
|---|---|
| `@Component()` | Marks a class as a component |
| `@Route('/path')` | Co-locates a page route with its component |
| `@Router([routes])` | Configures client-side routing on the root component |
| `@Storable()` | Marks a class as a reactive store singleton |

## Field decorators

| Decorator | Purpose |
|---|---|
| `@State()` | Reactive field — changes trigger UI updates |
| `@Computed()` | Derived value — re-evaluated when dependencies change |
| `@Prop()` | Incoming prop from parent |
| `@Store(Class)` | Injects a store singleton |
| `@Router()` | Injects the `RouterInstance` |
| `@Collection(Class)` | Injects a content collection as a `Resource` |

## Example

```tsx
@Storable()
class CartStore extends ReactiveStore {
  @State() items: string[] = []

  add(item: string) {
    this.items = [...this.items, item]
  }
}

@Component()
class CartButton extends StatefulComponent {
  @Store(CartStore) cart!: CartStore

  render() {
    return (
      <button onClick={() => this.cart.add('item')}>
        Cart ({() => this.cart.items.length})
      </button>
    )
  }
}
```
