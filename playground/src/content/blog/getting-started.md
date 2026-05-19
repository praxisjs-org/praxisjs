---
title: Getting Started with PraxisJS
date: 2026-05-18
description: An introduction to signals, decorators, and class components.
draft: false
tags: [tutorial, signals]
---

# Getting Started with PraxisJS

PraxisJS is a signal-driven TypeScript framework built on class components and decorators.

## Signals

Signals are reactive values. Use `@State()` to declare one on a component field:

```tsx
@Component()
class Counter extends StatefulComponent {
  @State() count = 0

  render() {
    return (
      <div>
        <p>{() => this.count}</p>
        <button onClick={() => this.count++}>+1</button>
      </div>
    )
  }
}
```

The `{() => this.count}` arrow function subscribes — the paragraph updates automatically when `count` changes.

## Computed values

```tsx
@Computed()
get doubled() {
  return this.count * 2
}
```

## Next steps

- Browse the other pages in this playground
- Read the [docs](https://praxisjs.dev)
