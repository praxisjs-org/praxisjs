# Getting Started

Verbose is a signal-driven frontend framework built with TypeScript. It provides fine-grained reactivity, class components with decorators, and a complete ecosystem of first-party packages.

## Installation

::: code-group

```sh [npm]
npm install @verbose/core @verbose/jsx @verbose/runtime @verbose/decorators
npm install -D @verbose/vite-plugin
```

```sh [pnpm]
pnpm add @verbose/core @verbose/jsx @verbose/runtime @verbose/decorators
pnpm add -D @verbose/vite-plugin
```

```sh [yarn]
yarn add @verbose/core @verbose/jsx @verbose/runtime @verbose/decorators
yarn add -D @verbose/vite-plugin
```

:::

## Project Setup

Configure Vite to use the Verbose plugin:

```ts
// vite.config.ts
import { defineConfig } from 'vite'
import { verbose } from '@verbose/vite-plugin'

export default defineConfig({
  plugins: [verbose({ hmr: true })],
})
```

Configure TypeScript to use the Verbose JSX runtime:

```json
// tsconfig.json
{
  "compilerOptions": {
    "experimentalDecorators": true,
    "jsx": "react-jsx",
    "jsxImportSource": "@verbose/jsx"
  }
}
```

## Your First Component

```tsx
import { Component, State, Prop } from '@verbose/decorators'
import { BaseComponent } from '@verbose/decorators'

@Component({ tag: 'my-counter' })
class Counter extends BaseComponent {
  @Prop() initialCount = 0
  @State() count = this.props.initialCount

  increment() {
    this.count++
  }

  render() {
    return (
      <div>
        <p>Count: {this.count}</p>
        <button onClick={() => this.increment()}>Increment</button>
      </div>
    )
  }
}
```

## Mounting the App

```ts
import { render } from '@verbose/runtime'
import { jsx } from '@verbose/jsx'

render(<Counter initialCount={0} />, document.getElementById('app')!)
```

## Package Overview

| Package | Purpose |
|---------|---------|
| [core](/packages/core) | Reactive primitives: `signal`, `computed`, `effect`, `resource` |
| [composables](/packages/composables) | DOM and browser composition utilities |
| [decorators](/packages/decorators) | Class decorators for components |
| [jsx](/packages/jsx) | JSX runtime and type definitions |
| [runtime](/packages/runtime) | VNode rendering engine |
| [store](/packages/store) | Reactive state management |
| [router](/packages/router) | Client-side routing |
| [motion](/packages/motion) | Animations: tweens, springs, keyframes |
| [fsm](/packages/fsm) | Finite state machines |
| [concurrent](/packages/concurrent) | Async concurrency control |
| [di](/packages/di) | Dependency injection container |
| [vite-plugin](/packages/vite-plugin) | Vite integration |
