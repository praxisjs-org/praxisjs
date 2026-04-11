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

## Passing props to child components

Props can be passed as **static values** or **reactive getters** — the difference determines whether the child updates when the parent's state changes.

### Static prop — snapshot at render time

```tsx
// ✅ valid — passes the current value of count at the moment Home renders
<Badge value={this.count} />
```

The child receives `0` (or whatever the current value is). If `count` changes later, `Badge` is **not** notified — it keeps the original value. Use this when the child only needs the value once, or when the prop never changes.

### Reactive prop — updates when the parent's state changes

```tsx
// ✅ reactive — Badge re-evaluates value whenever count changes
<Badge value={() => this.count} />
```

Passing a getter `() => this.count` lets the child pull the current value at any time. When `count` changes, any node inside `Badge` that reads `this.value` via `{() => this.value}` updates automatically.

### Full example

```tsx
interface BadgeProps {
  value: number
}

@Component()
class Badge extends StatelessComponent<BadgeProps> {
  render() {
    // this.props.value is whatever the parent passed —
    // if the parent passed () => this.count, the function itself lands here
    // and the renderer handles it reactively automatically
    return <span class="badge">{this.props.value}</span>
  }
}

@Component()
class Counter extends StatefulComponent {
  @State() count = 0

  render() {
    return (
      <div>
        {/* ✅ reactive — Badge updates when count changes */}
        <Badge value={() => this.count} />

        {/* ✅ static — Badge shows the value at render time, never updates */}
        <Badge value={this.count} />

        <button onClick={() => this.count++}>+</button>
      </div>
    )
  }
}
```

::: tip Rule of thumb
- Pass `() => this.state` when the child should stay in sync with the parent.
- Pass `this.state` when you want to capture the value at the current moment and the child doesn't need to react to future changes.
:::

Both forms are valid and safe — `render()` always runs untracked, so eager reads never cause unexpected side effects.

## Props are reactive too

The pattern differs depending on whether the child uses `@Prop()` or raw `this.props`.

**With `@Prop()`** — the decorator unwraps the getter, so you need `{() => this.text}` to create the reactive binding:

```tsx
@Component()
class Label extends StatefulComponent {
  @Prop() text = ''

  render() {
    // @Prop() calls () => this.text internally and returns the value —
    // wrap in () => so the renderer subscribes to it
    return <span>{() => this.text}</span>
  }
}
```

**With raw `this.props`** (StatelessComponent) — `this.props.text` returns whatever the parent passed, including the function itself if the parent passed a getter. The renderer detects the function and makes it reactive automatically:

```tsx
@Component()
class Label extends StatelessComponent<{ text: string }> {
  render() {
    // if parent passed text={() => this.name}, this.props.text IS the function —
    // no extra () => needed
    return <span>{this.props.text}</span>
  }
}
```

## Reading without tracking

Sometimes you need to read a signal's current value without creating a reactive subscription — for example, inside a `@Watch` to compare a previous value, or inside a method that should not trigger re-subscriptions.

### `peek(signal)`

Reads a signal once without subscribing to it:

```tsx
import { peek } from '@praxisjs/core'

@Component()
class Counter extends StatefulComponent {
  @State() count = 0
  @State() max = 10

  increment() {
    // read max without subscribing to it inside a reactive context
    if (peek(this.max) > peek(this.count)) {
      this.count++
    }
  }

  render() {
    return <button onClick={() => this.increment()}>{() => this.count}</button>
  }
}
```

`peek` accepts any `Signal<T>` or `Computed<T>` and returns the current value without registering a dependency.

### `untrack(fn)`

Runs an arbitrary function without tracking any signal reads inside it:

```tsx
import { untrack } from '@praxisjs/core'

@Watch('items')
onItemsChange() {
  // read totalCost without subscribing to it
  const snapshot = untrack(() => this.totalCost)
  console.log('items changed, cost was:', snapshot)
}
```

::: tip When to use each
- Use `peek(signal)` when you have a direct signal reference and want a clean, explicit read.
- Use `untrack(fn)` when you want to suppress tracking for a block of code that may read multiple signals.
:::

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
- peek(signal) temporarily sets activeEffect = null, reads the signal, then restores activeEffect — same as untrack but typed for Signal/Computed
- untrack(fn) sets activeEffect = null for the duration of fn, then restores — suppresses all tracking for any signals read inside fn
- render() itself always runs untracked (activeEffect = null during mountComponent) — so eager reads like {this.count} in JSX are always static snapshots, not subscriptions
- Props passed as plain values (description={this.count}) are static — the child gets the value at mount time and never sees future changes
- Props passed as getters (description={() => this.count}) are reactive — with @Prop(), the decorator unwraps the getter on each read, so {() => this.prop} in the child subscribes transitively; with raw this.props, the function itself is returned and the renderer handles it as a reactive child automatically (no extra () => wrapper needed)
Never hardcode package versions in package.json. Always install packages using @latest (e.g. `npm install @praxisjs/core@latest`) so the user gets the current release.
</llm-only>
