---
title: Quick Start
description: Create a new PraxisJS project and build your first component in minutes.
---

# Quick Start

## Automatic setup

The fastest way to get started is `create-praxisjs`, which scaffolds a project with TypeScript, Vite, JSX, and HMR already configured.

::: code-group

```sh [npm]
npm create praxisjs@latest
```

```sh [pnpm]
pnpm create praxisjs
```

```sh [yarn]
yarn create praxisjs
```

```sh [bun]
bun create praxisjs
```

:::

The CLI will ask for a project name and template:

| Template | Packages included |
|---|---|
| **Minimal** | core, decorators, jsx, runtime |
| **With Router** | Minimal + router |
| **Full** | Router + store, di, composables, concurrent, devtools |

Then start the dev server:

```sh
cd my-app
npm install
npm run dev
```

---

## Manual setup

### Install packages

::: code-group

```sh [npm]
npm install @praxisjs/core @praxisjs/jsx @praxisjs/runtime @praxisjs/decorators
npm install -D @praxisjs/vite-plugin
```

```sh [pnpm]
pnpm add @praxisjs/core @praxisjs/jsx @praxisjs/runtime @praxisjs/decorators
pnpm add -D @praxisjs/vite-plugin
```

```sh [yarn]
yarn add @praxisjs/core @praxisjs/jsx @praxisjs/runtime @praxisjs/decorators
yarn add -D @praxisjs/vite-plugin
```

:::

### Configure Vite

```ts
// vite.config.ts
import { defineConfig } from 'vite'
import { praxisjs } from '@praxisjs/vite-plugin'

export default defineConfig({
  plugins: [praxisjs({ hmr: true })],
})
```

### Configure TypeScript

```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "jsxImportSource": "@praxisjs/jsx",
    "useDefineForClassFields": false,
    "strict": true,
    "noEmit": true
  }
}
```

::: warning `useDefineForClassFields: false` is required
With `true` (the ES2022+ default), TypeScript compiles class fields using `Object.defineProperty`, which runs **after** decorator initializers and overwrites the getter/setter they registered. Setting it to `false` compiles fields as constructor assignments (`this.x = value`), so the decorator's signal wiring stays intact.
:::

---

## Your first component

```tsx
// src/Counter.tsx
import { StatefulComponent } from '@praxisjs/core'
import { Component, State, Prop } from '@praxisjs/decorators'

@Component()
class Counter extends StatefulComponent {
  @Prop() initialCount = 0
  @State() count = 0

  onMount() {
    this.count = this.initialCount
  }

  render() {
    return (
      <div>
        <p>Count: {() => this.count}</p>
        <button onClick={() => this.count++}>+</button>
        <button onClick={() => this.count--}>-</button>
      </div>
    )
  }
}
```

::: tip Why `{() => this.count}` and not `{this.count}`?
`render()` runs **once** on mount. To keep a value reactive in the DOM, wrap it in an arrow function — the renderer tracks it as a live dependency. `{this.count}` captures the value at render time and never updates.
:::

## Mount the app

```ts
// src/main.ts
import { render } from '@praxisjs/runtime'
import { Counter } from './Counter'

render(() => <Counter initialCount={5} />, document.getElementById('app')!)
```

---

## What's next?

- [Components](/essentials/components) — stateful and stateless components
- [Reactivity & Signals](/essentials/reactivity) — how signals work under the hood
- [Decorators: State & Props](/decorators/state) — full decorator reference

<llm-only>
IMPORTANT for code generation:
- Always import @Component, @State, @Prop from '@praxisjs/decorators'
- Always import StatefulComponent from '@praxisjs/core'
- Always import render from '@praxisjs/runtime'
- Files that contain JSX must have .tsx extension
- The jsxImportSource in tsconfig.json must be "@praxisjs/jsx"
- useDefineForClassFields in tsconfig.json MUST be false — decorator signal wiring breaks if it is true
- render() is called ONCE — all dynamic values in JSX MUST be arrow functions: {() => this.value}
</llm-only>
