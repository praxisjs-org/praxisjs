# Getting Started

PraxisJS is a signal-driven frontend framework built with TypeScript. It provides fine-grained reactivity, class components with decorators, and a complete ecosystem of first-party packages.

::: warning Experimental
PraxisJS is under active development. APIs are unstable and subject to breaking changes at any time. Not recommended for production use. [See project status →](/project-status)
:::

## Why Praxis?

*Praxis* (πρᾶξις, Greek: *action*, *practice*). Not how things should be — how they are actually done.

The ancient concept that separates those who understand from those who execute. Not theory, not intention — only the act that emerges when knowledge and craft become inseparable.

Most frameworks hide their praxis. Write less, trust more, let the runtime handle the rest. PraxisJS refuses that contract.

`@State` doesn't *suggest* that a property is reactive — it *is* reactive, and you can read that in the code. `@Prop` doesn't imply a contract — it declares one. `@Watch` doesn't hint at a side effect — it commits to one. The component doesn't hide what it does: **it practices openly**.

Fine-grained reactivity, TypeScript-native, signals that reach the DOM with no reconciliation pass between intention and result — nothing hidden, nothing assumed.

## Automatic setup

Run `create-praxisjs` to generate a new project with TypeScript, Vite, JSX, and all dependencies already configured.

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

You can also pass the project name as an argument to skip the first prompt:

```sh
npm create praxisjs@latest my-app
```

The CLI will then ask which template to use:

| Template | Includes |
| -------- | -------- |
| Minimal | `@praxisjs/core`, `@praxisjs/decorators`, `@praxisjs/jsx`, `@praxisjs/runtime` |
| With Router | Minimal + `@praxisjs/router` |
| Full | Router + `@praxisjs/store`, `@praxisjs/di`, `@praxisjs/composables`, `@praxisjs/concurrent`, `@praxisjs/devtools` |

Once the project is created, install dependencies and start the dev server:

```sh
cd my-app
npm install
npm run dev
```

The dev server starts at `http://localhost:5173` with HMR enabled via `@praxisjs/vite-plugin`.

---

## Manual setup

Prefer to configure everything yourself? Install only the packages you need.

### Installation

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

### Project setup

Configure Vite to use the PraxisJS plugin:

```ts
// vite.config.ts
import { defineConfig } from "vite";
import { praxisjs } from "@praxisjs/vite-plugin";

export default defineConfig({
  plugins: [praxisjs({ hmr: true })],
});
```

Configure TypeScript to use the PraxisJS JSX runtime:

```json
// tsconfig.json
{
  "compilerOptions": {
    "experimentalDecorators": true,
    "jsx": "react-jsx",
    "jsxImportSource": "@praxisjs/jsx"
  }
}
```

### Your first component

```tsx
import { Component, State, Prop } from "@praxisjs/decorators";
import { BaseComponent } from "@praxisjs/core";

@Component()
class Counter extends BaseComponent {
  @Prop() initialCount = 0;
  @State() count = 0;

  increment() {
    this.count++;
  }

  render() {
    return (
      <div>
        <p>Count: {this.count}</p>
        <button onClick={() => this.increment()}>Increment</button>
      </div>
    );
  }
}
```

### Mounting the app

```ts
import { render } from '@praxisjs/runtime'

render(<Counter initialCount={0} />, document.getElementById('app')!)
```

---

## Package overview

| Package                              | Purpose                                                         |
| ------------------------------------ | --------------------------------------------------------------- |
| [core](/packages/core)               | Reactive primitives: `signal`, `computed`, `effect`, `resource` |
| [composables](/packages/composables) | DOM and browser composition utilities                           |
| [decorators](/packages/decorators)   | Class decorators for components                                 |
| [jsx](/packages/jsx)                 | JSX runtime and type definitions                                |
| [runtime](/packages/runtime)         | VNode rendering engine                                          |
| [store](/packages/store)             | Reactive state management                                       |
| [router](/packages/router)           | Client-side routing                                             |
| [motion](/packages/motion)           | Animations: tweens, springs, keyframes                          |
| [fsm](/packages/fsm)                 | Finite state machines                                           |
| [concurrent](/packages/concurrent)   | Async concurrency control                                       |
| [di](/packages/di)                   | Dependency injection container                                  |
| [vite-plugin](/packages/vite-plugin) | Vite integration                                                |
| [devtools](/packages/devtools)       | In-app developer tools panel                                    |
