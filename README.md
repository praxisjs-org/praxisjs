<div align="center">

<img src="docs/src/public/logo.svg" width="64" height="64" alt="PraxisJS logo" />

# PraxisJS

**Signal-driven frontend framework for TypeScript.**
Fine-grained reactivity · Class components · Decorator-first API · Complete ecosystem.

[![npm](https://img.shields.io/npm/v/@praxisjs/core?label=version&color=38bdf8)](https://www.npmjs.com/package/@praxisjs/core)
[![codecov](https://codecov.io/gh/praxisjs-org/praxisjs/graph/badge.svg?token=VTZHTEP9QT)](https://codecov.io/gh/praxisjs-org/praxisjs)
[![license](https://img.shields.io/github/license/praxisjs-org/praxisjs?color=38bdf8)](./LICENSE)

[Documentation](https://praxisjs.org) · [Getting Started](https://praxisjs.org/guide/getting-started) · [GitHub](https://github.com/praxisjs-org/praxisjs)

</div>

---

## Overview

PraxisJS is a TypeScript frontend framework built around fine-grained signals. Components are classes decorated with a rich set of built-in decorators, and the first-party ecosystem covers routing, state management, animations, dependency injection, and more — all designed to work together.

```tsx
import { Component, State, Watch } from '@praxisjs/decorators'
import { StatefulComponent } from '@praxisjs/core'

@Component()
class Counter extends StatefulComponent {
  @State() count = 0

  @Watch('count')
  onCountChange(next: number) {
    console.log('count is now', next)
  }

  render() {
    return (
      <div>
        <p>Count: {() => this.count}</p>
        <button onClick={() => this.count++}>Increment</button>
      </div>
    )
  }
}
```

---

## Packages

### Foundation

| Package | Description |
|---|---|
| `@praxisjs/core` | Signals, computed values, effects, and async resources |
| `@praxisjs/decorators` | Class component decorators (`@Component`, `@State`, `@Prop`, `@Watch`, …) |
| `@praxisjs/jsx` | JSX runtime |
| `@praxisjs/runtime` | Rendering engine |
| `@praxisjs/shared` | Shared types and utilities |

### Features

| Package | Description |
|---|---|
| `@praxisjs/router` | Client-side router |
| `@praxisjs/store` | Global state management |
| `@praxisjs/motion` | Animations and transitions |
| `@praxisjs/di` | Dependency injection |
| `@praxisjs/fsm` | Finite state machines |

### Utils

| Package | Description |
|---|---|
| `@praxisjs/composables` | DOM, browser, and concurrency utilities |
| `@praxisjs/concurrent` | Concurrency control decorators |

### DX

| Package | Description |
|---|---|
| `@praxisjs/devtools` | In-app developer tools overlay |
| `@praxisjs/vite-plugin` | Vite integration |
| `create-praxisjs` | Project scaffolding CLI |

---

## Development

Monorepo managed with [pnpm workspaces](https://pnpm.io/workspaces).

```sh
pnpm install

# build all packages
pnpm build

# build by layer
pnpm build:foundation
pnpm build:features
pnpm build:utils
pnpm build:dx

# run tests
pnpm test

# typecheck & lint
pnpm typecheck
pnpm lint

# docs dev server
pnpm docs:dev
```

---

## Contributing

PraxisJS is a personal project built out of curiosity and a desire to explore framework design from scratch. Contributions are welcome — bug reports, ideas, or pull requests. Feel free to open an issue before diving in.

## License

[MIT](./LICENSE)
