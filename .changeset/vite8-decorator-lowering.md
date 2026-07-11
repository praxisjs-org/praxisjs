---
"@praxisjs/vite-plugin": major
---

Upgraded to Vite 8 (rolldown-vite). Vite 8's oxc-based transform doesn't lower TC39 (non-legacy) decorators yet ([oxc-project/oxc#9170](https://github.com/oxc-project/oxc/issues/9170)), so `praxisjs()` now uses the TypeScript compiler (`ts.transpileModule`) to lower decorator syntax into runtime-executable code, leaving JSX untouched for oxc's own JSX pipeline. No third-party decorator transform is bundled — TypeScript's decorator lowering keeps class fields as native ES2022 fields, so a decorated field's `addInitializer` callback already runs after `super()` in a derived class's explicit constructor without any extra fix-up pass.

The `esbuild` config key (deprecated in Vite 8) was replaced with `oxc` in the plugin's own `config()` hook.

`typescript` moved from a `devDependency` to a regular `dependency`, since the decorator-lowering pass now calls it at runtime — it's pulled in automatically, no action needed.

**Breaking:** `@praxisjs/vite-plugin` now requires Vite `^8.0.0`. Apps still on Vite 7 should stay on the previous `@praxisjs/vite-plugin` major version.

**Also requires `useDefineForClassFields: true`** in your `tsconfig.json` (previously `false`) — see the updated [Getting Started](/docs/guide/getting-started) guide. With `false`, oxc silently drops a class field's decorator during its own TypeScript stripping, before the lowering step ever sees it.

**`decoratorLoweringPlugin()` is now exported** alongside `praxisjs()`, so it can be registered directly in `vitest.config.ts` (or any other Vite-based tool) to lower decorator syntax outside of the full `praxisjs()` plugin — see [Using decorators in Vitest](/docs/tooling/vite-plugin#using-decorators-in-vitest).
