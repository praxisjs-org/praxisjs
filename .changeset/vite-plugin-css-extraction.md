---
"@praxisjs/vite-plugin": minor
---

Add `praxisjsCSS()` — static CSS extraction plugin for `@praxisjs/css`.

Scans TypeScript source files for `Stylesheet` subclasses, `keyframes()`, `globalStyle()`, and `@Themed()` decorators, evaluates them in a sandboxed Node.js context, and emits all CSS into `virtual:praxisjs/styles.css`. In production, runtime `<style>` injection is disabled via `__PRAXIS_CSS_STATIC__`. In development, the virtual module is empty and CSS is injected at runtime as usual.

```ts
// vite.config.ts
import { praxisjs, praxisjsCSS } from '@praxisjs/vite-plugin'

export default defineConfig({
  plugins: [praxisjs(), praxisjsCSS()],
})
```

```ts
// main.ts
import 'virtual:praxisjs/styles.css'
```

`@praxisjs/css` is now a peer dependency.
