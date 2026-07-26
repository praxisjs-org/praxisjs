# @praxisjs/vite-plugin

## 4.0.3

### Patch Changes

- 192dfc0: Fix `decoratorLoweringPlugin()` (used internally by `praxisjs()`, and by `@praxisjs/storybook`'s Vite config) silently dropping decorated class fields that have no initializer, e.g. `@Styled(BadgeStyles) $s!: BadgeStyles;` or `@Ref<HTMLElement>() containerRef!: Ref<HTMLElement>;`.

  The plugin ran in Vite's default "normal" transform tier, after Vite's built-in esbuild TypeScript transform had already parsed the file. esbuild's TC39 decorator support drops such fields entirely instead of lowering them, so by the time `decoratorLoweringPlugin` ran `ts.transpileModule` on the code, the field and its decorator were already gone — with no build-time error. At runtime the field read back as `undefined`, so any component reading it (e.g. `this.$s.$root`) threw inside `render()`/`onMount()`; since neither swallowed the error nor logged it, the component silently rendered nothing.

  `decoratorLoweringPlugin()` now sets `enforce: "pre"`, so it runs before Vite's esbuild transform ever sees the file — real decorators are fully lowered first, and esbuild only has to strip types and compile JSX from output that no longer contains any decorator syntax.

## 4.0.2

### Patch Changes

- e65617f: Fix `praxisjsCSS()` build-time extraction treating tsconfig path aliases (e.g. `@/lib/tokens`, mapped via `compilerOptions.paths`) as external npm packages. The extraction sandbox resolved these to an empty stub instead of the real local file, silently dropping the CSS of any `Stylesheet` that imported values (most commonly design tokens) through an alias. Aliased imports are now resolved through esbuild's own tsconfig-aware resolver instead of being externalized.
- Updated dependencies [e65617f]
  - @praxisjs/css@0.3.1

## 4.0.1

### Patch Changes

- 22d9a4e: Move `esbuild` from `devDependencies` to `dependencies`. It's imported at runtime by the CSS extraction step, so it was missing from `node_modules` in consumer projects (e.g. `create-praxisjs` scaffolds), causing `ERR_MODULE_NOT_FOUND: esbuild` on `vite dev`/`vite build`.

## 4.0.0

### Major Changes

- 9c2a7e0: Upgraded to Vite 8 (rolldown-vite). Vite 8's oxc-based transform doesn't lower TC39 (non-legacy) decorators yet ([oxc-project/oxc#9170](https://github.com/oxc-project/oxc/issues/9170)), so `praxisjs()` now uses the TypeScript compiler (`ts.transpileModule`) to lower decorator syntax into runtime-executable code, leaving JSX untouched for oxc's own JSX pipeline. No third-party decorator transform is bundled — TypeScript's decorator lowering keeps class fields as native ES2022 fields, so a decorated field's `addInitializer` callback already runs after `super()` in a derived class's explicit constructor without any extra fix-up pass.

  The `esbuild` config key (deprecated in Vite 8) was replaced with `oxc` in the plugin's own `config()` hook.

  `typescript` moved from a `devDependency` to a regular `dependency`, since the decorator-lowering pass now calls it at runtime — it's pulled in automatically, no action needed.

  **Breaking:** `@praxisjs/vite-plugin` now requires Vite `^8.0.0`. Apps still on Vite 7 should stay on the previous `@praxisjs/vite-plugin` major version.

  **Also requires `useDefineForClassFields: true`** in your `tsconfig.json` (previously `false`) — see the updated [Getting Started](/docs/guide/getting-started) guide. With `false`, oxc silently drops a class field's decorator during its own TypeScript stripping, before the lowering step ever sees it.

  **`decoratorLoweringPlugin()` is now exported** alongside `praxisjs()`, so it can be registered directly in `vitest.config.ts` (or any other Vite-based tool) to lower decorator syntax outside of the full `praxisjs()` plugin — see [Using decorators in Vitest](/docs/tooling/vite-plugin#using-decorators-in-vitest).

## 3.0.0

### Patch Changes

- Updated dependencies [6140752]
  - @praxisjs/css@0.3.0

## 2.0.0

### Patch Changes

- Updated dependencies [ffc4aec]
  - @praxisjs/css@0.2.0

## 1.0.7

### Patch Changes

- @praxisjs/css@0.1.7

## 1.0.6

### Patch Changes

- Updated dependencies [8ab6426]
  - @praxisjs/css@0.1.6

## 1.0.5

### Patch Changes

- @praxisjs/css@0.1.5

## 1.0.4

### Patch Changes

- @praxisjs/css@0.1.4

## 1.0.3

### Patch Changes

- @praxisjs/css@0.1.3

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
