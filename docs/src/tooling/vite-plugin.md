---
title: Vite Plugin
description: "@praxisjs/vite-plugin — configures Vite for PraxisJS with decorator support, JSX transform, TypeScript, and optional HMR."
---

# Vite Plugin

The Vite plugin handles all the configuration needed to run PraxisJS — decorator support, JSX transform, and optional HMR.

::: code-group

```sh [npm]
npm install -D @praxisjs/vite-plugin
```

```sh [pnpm]
pnpm add -D @praxisjs/vite-plugin
```

```sh [yarn]
yarn add -D @praxisjs/vite-plugin
```

```sh [bun]
bun add -d @praxisjs/vite-plugin
```

:::

## Setup

```ts
// vite.config.ts
import { defineConfig } from 'vite'
import { praxisjs } from '@praxisjs/vite-plugin'

export default defineConfig({
  plugins: [praxisjs()],
})
```

## Options

```ts
praxisjs({
  hmr: true,         // Enable component-level hot reload (default: false)
  autoImport: true,  // Auto-import common decorators (default: false)
})
```

| Option | Type | Default | Description |
|---|---|---|---|
| `hmr` | `boolean` | `false` | Component-level hot module replacement |
| `autoImport` | `boolean` | `false` | Auto-import `@Component`, `@State`, `@Prop` etc. |

## What the plugin does

- **Decorators** — sets esbuild `target: 'ES2022'` to enable native TypeScript decorators
- **JSX transform** — configures the React-JSX transform to use `@praxisjs/jsx` as the import source
- **HMR** — when enabled, components update in place without a full page reload when their source changes

## TypeScript config

The plugin handles Vite/esbuild, but you still need to configure TypeScript separately:

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
With `true`, TypeScript compiles class fields via `Object.defineProperty`, which runs after decorator initializers and overwrites the signal wiring they set up. Set it to `false` so fields compile as constructor assignments and decorators work correctly.
:::

<llm-only>
Vite plugin facts:
- The plugin must be the first (or only) plugin in the Vite config plugins array
- Without the plugin, decorators will not work and JSX will not compile
- HMR requires components to be exported — anonymous default exports may not HMR correctly
- The plugin does NOT configure tsconfig.json — users must set jsxImportSource manually
</llm-only>
