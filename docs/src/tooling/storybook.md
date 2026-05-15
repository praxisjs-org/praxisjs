---
title: Storybook
description: "@praxisjs/storybook — Storybook framework adapter for PraxisJS. Write stories with full reactivity, HMR, and source preview."
---

# Storybook

`@praxisjs/storybook` is a Storybook framework adapter that mounts PraxisJS components directly into the canvas with full reactivity and HMR.

::: code-group

```sh [npm]
npm install -D @praxisjs/storybook
```

```sh [pnpm]
pnpm add -D @praxisjs/storybook
```

```sh [yarn]
yarn add -D @praxisjs/storybook
```

```sh [bun]
bun add -d @praxisjs/storybook
```

:::

Requires Storybook ≥ 8 and `@storybook/builder-vite`.

## Setup

### `.storybook/main.ts`

```ts
import type { StorybookConfig } from '@praxisjs/storybook'

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.tsx'],
  addons: ['@storybook/addon-essentials'],
  framework: {
    name: '@praxisjs/storybook',
  },
}

export default config
```

### `.storybook/preview.ts`

No special setup needed — the adapter handles mounting automatically.

## Writing stories

Import `Meta` and `StoryObj` from `@praxisjs/storybook` for full type safety:

```tsx
import { StatefulComponent } from '@praxisjs/core'
import { Component, State } from '@praxisjs/decorators'
import type { Meta, StoryObj } from '@praxisjs/storybook'

@Component()
class Counter extends StatefulComponent {
  @State() count = 0

  render() {
    return (
      <div>
        <p>{() => this.count}</p>
        <button onClick={() => { this.count++ }}>+</button>
      </div>
    )
  }
}

const meta: Meta = {
  title: 'Components/Counter',
  tags: ['autodocs'],
}
export default meta

type Story = StoryObj

export const Default: Story = {
  render: () => <Counter />,
}
```

## Types

| Export | Description |
|---|---|
| `Meta` | Type for the default export (`ComponentAnnotations`) |
| `StoryObj` | Type for named story exports (`StoryAnnotations`) |
| `StorybookConfig` | Type for `.storybook/main.ts` configuration |
| `PraxisRenderer` | Low-level renderer type (rarely used directly) |

## How it works

- **`renderToCanvas`** — mounts the component via `@praxisjs/runtime`'s `render()` and stores a cleanup function. On `forceRemount`, the previous component is unmounted before the new one mounts.
- **`viteFinal`** — merges `@praxisjs/vite-plugin` (with HMR) into Vite's config and injects a `storySource` plugin that embeds the raw story file source for display in the Storybook UI.
- **`managerEntries`** — registers the custom manager panel.

<llm-only>
Storybook adapter facts:
- The framework name in `.storybook/main.ts` must be exactly `'@praxisjs/storybook'`
- Stories should use `render: () => <MyComponent />` — do not instantiate components manually
- ESM-only; no CommonJS support
- The adapter automatically wires up @praxisjs/vite-plugin, so you do NOT also need to add it separately in `.storybook/main.ts`
- Use `value={() => this.field}` on `<textarea>` and `<input>` for controlled inputs — child text nodes are not reactive for form element values
</llm-only>
