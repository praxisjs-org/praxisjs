# @verbose/vite-plugin

::: code-group

```sh [npm]
npm install -D @verbose/vite-plugin
```

```sh [pnpm]
pnpm add -D @verbose/vite-plugin
```

```sh [yarn]
yarn add -D @verbose/vite-plugin
```

:::

Vite plugin that configures the build for Verbose: decorator support, JSX transform, and optional Hot Module Replacement.

## Setup

```ts
// vite.config.ts
import { defineConfig } from 'vite'
import { verbose } from '@verbose/vite-plugin'

export default defineConfig({
  plugins: [verbose()],
})
```

## `verbose(options?)`

Returns an array of Vite plugins. Pass the result directly to the `plugins` array.

```ts
verbose({
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

### Core plugin (`verbose:core`)

- Sets `esbuild.target` to `es2022` to enable native decorator support
- Configures `esbuild.jsx` and `jsxImportSource` when `autoImport` is enabled

### HMR plugin (`verbose:hmr`)

When `hmr: true`, watches component files for changes and sends `verbose:component-update` custom events to the browser. This triggers in-place component reloads without a full page refresh.

---

## Recommended `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "experimentalDecorators": true,
    "useDefineForClassFields": false,
    "jsx": "react-jsx",
    "jsxImportSource": "@verbose/jsx"
  }
}
```

`useDefineForClassFields: false` is required for decorators like `@State` and `@Prop` to intercept property definitions correctly.
