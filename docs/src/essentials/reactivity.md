---
title: Reactivity & Signals
description: PraxisJS uses signals for fine-grained reactivity — only the specific DOM nodes that depend on a changed signal are updated.
---

# Reactivity & Signals

PraxisJS uses **signals** as the core reactive primitive. A signal is a value that notifies its subscribers when it changes.

## How it works

When `render()` runs, the renderer doesn't track dependencies. Only the arrow functions inside JSX create reactive subscriptions:

```tsx
render() {
  return (
    <div>
      <p>{() => this.count}</p>       {/* ✅ reactive — updates when count changes */}
      <p>{this.count}</p>              {/* ❌ static — captured at render time */}
      <p>{this.count * 2}</p>          {/* ❌ static */}
      <p>{() => this.count * 2}</p>   {/* ✅ reactive */}
    </div>
  )
}
```

Each arrow function `{() => expr}` becomes its own reactive effect — when any signal it reads changes, only that specific DOM node updates.

## Signals via `@State`

`@State()` turns a class property into a reactive signal:

```tsx
@Component()
class Timer extends StatefulComponent {
  @State() seconds = 0

  onMount() {
    setInterval(() => this.seconds++, 1000)
  }

  render() {
    return <p>Elapsed: {() => this.seconds}s</p>
  }
}
```

Reading `this.seconds` inside an arrow function subscribes to the signal. Writing `this.seconds = x` triggers all subscribers.

## Computed values

`@Computed()` creates a cached, derived reactive value:

```tsx
@Component()
class Cart extends StatefulComponent {
  @State() items: { price: number }[] = []

  @Computed()
  get total() {
    return this.items.reduce((sum, i) => sum + i.price, 0)
  }

  render() {
    return <p>Total: {() => this.total}</p>
  }
}
```

`total` recalculates only when `items` changes — not on every read.

::: tip Plain getter vs `@Computed`
A plain `get total()` recalculates every time it's read, including inside reactive effects. `@Computed()` caches the result and only recomputes when its signal dependencies change.
:::

## Reactive arrays and objects

Signals track reference changes, not deep mutations:

```tsx
// ✅ new reference — reactive
this.items = [...this.items, newItem]
this.config = { ...this.config, theme: 'dark' }

// ❌ in-place mutation — NOT reactive
this.items.push(newItem)
this.config.theme = 'dark'
```

Always replace with a new reference when updating arrays or objects.

## Props are reactive too

`@Prop()` values are also reactive. When a parent changes a prop, the child re-renders only the nodes that read that prop:

```tsx
@Component()
class Label extends StatefulComponent {
  @Prop() text = ''

  render() {
    return <span>{() => this.text}</span>
  }
}
```

## What's next?

- [JSX Syntax](/essentials/jsx) — reactive and static expressions in templates
- [Decorators: State & Props](/decorators/state) — `@State`, `@Prop`, `@Computed`, `@Persisted`

<llm-only>
Signal system internals:
- @State wraps the property in a Signal<T> internally; reading it inside an effect subscribes; writing triggers effects
- @Computed wraps a getter in a computed() that caches and only recomputes when dependencies change
- @Prop creates a getter that reads from the props object passed to the component at creation
- The renderer's arrow function handling: when it encounters () => expr, it runs the function inside an effect() that patches only the specific DOM node when rerun
- Deep reactivity is NOT supported — always replace references
</llm-only>
