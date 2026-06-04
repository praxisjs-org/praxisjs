# @praxisjs/vite-plugin

## 1.0.2

### Patch Changes

- @praxisjs/css@0.1.2

## 1.0.1

### Patch Changes

- @praxisjs/css@0.1.1

## 1.0.0

### Minor Changes

- 8abc950: Add `praxisjsCSS()` — static CSS extraction plugin for `@praxisjs/css`.

  Scans TypeScript source files for `Stylesheet` subclasses, `keyframes()`, `globalStyle()`, and `@Themed()` decorators, evaluates them in a sandboxed Node.js context, and emits all CSS into `virtual:praxisjs/styles.css`. In production, runtime `<style>` injection is disabled via `__PRAXIS_CSS_STATIC__`. In development, the virtual module is empty and CSS is injected at runtime as usual.

  ```ts
  // vite.config.ts
  import { praxisjs, praxisjsCSS } from "@praxisjs/vite-plugin";

  export default defineConfig({
    plugins: [praxisjs(), praxisjsCSS()],
  });
  ```

  ```ts
  // main.ts
  import "virtual:praxisjs/styles.css";
  ```

  `@praxisjs/css` is now a peer dependency.

### Patch Changes

- Updated dependencies [74fabcc]
  - @praxisjs/css@0.1.0

## 0.1.1

### Patch Changes

- 2c61a25: Refresh dependencies across workspace to improve stability and security.

  Bumped versions of several packages, including @types/node, eslint, and unocss, to enhance compatibility and security.

## 0.1.0

### Minor Changes

- aaf7dab: Initial beta release
