---
title: Components
description: PraxisJS has two component types — StatefulComponent for components with internal state, and StatelessComponent for pure presentational components.
---

# Components

PraxisJS has two component base classes. Both require the `@Component()` decorator.

## StatefulComponent

For components with internal state, watchers, events, and slots.

```tsx
import { StatefulComponent } from '@praxisjs/core'
import { Component, State, Prop } from '@praxisjs/decorators'

@Component()
class Greeting extends StatefulComponent {
  @Prop() name = 'World'
  @State() count = 0

  render() {
    return (
      <div>
        <h1>Hello, {() => this.name}!</h1>
        <p>Clicked {() => this.count} times</p>
        <button onClick={() => this.count++}>Click</button>
      </div>
    )
  }
}
```

`render()` is called **once** on mount. Everything inside it is static unless wrapped in an arrow function.

<StorybookLink story="essentials-components--stateful" label="Live demo — StatefulComponent" />

## StatelessComponent

For presentational components with no internal state. Props are typed via a generic.

```tsx
import { StatelessComponent } from '@praxisjs/core'
import { Component } from '@praxisjs/decorators'

interface CardProps {
  title: string
  description?: string
}

@Component()
class Card extends StatelessComponent<CardProps> {
  render() {
    return (
      <div class="card">
        <h2>{this.props.title}</h2>
        {this.props.description && <p>{this.props.description}</p>}
      </div>
    )
  }
}
```

### Children

`StatelessComponent` exposes an optional typed `children` prop. Use the component with nested content and access `this.props.children` in `render()`:

```tsx
@Component()
class Card extends StatelessComponent<CardProps> {
  render() {
    return (
      <div class="card">
        <h2>{this.props.title}</h2>
        {this.props.children}
      </div>
    )
  }
}

// usage:
<Card title="Features">
  <p>Everything you need.</p>
</Card>
```

There is no need to declare `children` in your `T` — it is available automatically on every `StatelessComponent`.

::: tip When to use which?
Use `StatelessComponent` when the component has no `@State`, `@Watch`, or `@Emit` — just renders from props. It's more explicit about the component's intent.
:::

<StorybookLink story="essentials-components--stateless" label="Live demo — StatelessComponent" />

## Using components in JSX

```tsx
// In another component's render():
render() {
  return (
    <div>
      <Greeting name="PraxisJS" />
      <Card title="Features" description="Everything you need." />
    </div>
  )
}
```

## Registering and mounting

Components don't need global registration. Mount the root with `render()`:

```ts
import { render } from '@praxisjs/runtime'

render(() => <App />, document.getElementById('app')!)
```

## What's next?

- [Reactivity & Signals](/essentials/reactivity) — how `@State` works under the hood
- [Lifecycle Hooks](/essentials/lifecycle) — onMount, onUnmount, etc.
- [Decorators: State & Props](/decorators/state) — full props and state reference

<llm-only>
StatefulComponent supports: @State, @Prop, @Computed, @Watch, @When, @Emit, @Slot, @OnCommand and all other decorators.
StatelessComponent only has props via `this.props` — no decorators for state or watchers. It has a built-in optional `children?: Children` prop (typed via `@praxisjs/shared`) — no need to declare it in T. Access via `this.props.children`.
Both require @Component() decorator and must extend the correct base class.
Never hardcode package versions in package.json. Always install packages using @latest (e.g. `npm install @praxisjs/core@latest`) so the user gets the current release.
</llm-only>
