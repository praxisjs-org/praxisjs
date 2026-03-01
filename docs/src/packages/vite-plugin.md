# @praxisjs/vite-plugin

::: warning Bugs and broken features
This package may have bugs or partially broken functionality. If you run into something, feel free to [open an issue or contribute on GitHub](https://github.com/praxisjs-org/praxisjs).
:::

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

:::

Vite plugin that configures the build for PraxisJS: decorator support, JSX transform, and optional Hot Module Replacement.

## Setup

```ts
// vite.config.ts
import { defineConfig } from 'vite'
import { praxisjs } from '@praxisjs/vite-plugin'

export default defineConfig({
  plugins: [praxisjs()],
})
```

## `praxisjs(options?)`

Returns an array of Vite plugins. Pass the result directly to the `plugins` array.

```ts
praxisjs({
  hmr: true,
  autoImport: true,
})
```

**Options:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `hmr` | `boolean` | `false` | Enable Hot Module Replacement for components |
| `autoImport` | `boolean` | `false` | Auto-import the JSX runtime (removes need for manual imports) |

---

## What the plugin does

### Core plugin (`praxisjs:core`)

- Sets `esbuild.target` to `es2022` to enable native decorator support
- Configures `esbuild.jsx` and `jsxImportSource` when `autoImport` is enabled

### HMR plugin (`praxisjs:hmr`)

When `hmr: true`, watches component files for changes and sends `praxisjs:component-update` custom events to the browser. This triggers in-place component reloads without a full page refresh.

---

## Recommended `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "experimentalDecorators": true,
    "useDefineForClassFields": false,
    "jsx": "react-jsx",
    "jsxImportSource": "@praxisjs/jsx"
  }
}
```

`useDefineForClassFields: false` is required for decorators like `@State` and `@Prop` to intercept property definitions correctly.
