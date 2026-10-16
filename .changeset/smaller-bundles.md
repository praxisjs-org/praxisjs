---
"@praxisjs/core": patch
"@praxisjs/shared": patch
"@praxisjs/decorators": patch
"@praxisjs/runtime": patch
"@praxisjs/jsx": patch
"@praxisjs/router": patch
"@praxisjs/store": patch
"@praxisjs/motion": patch
"@praxisjs/di": patch
"@praxisjs/fsm": patch
"@praxisjs/content": patch
"@praxisjs/head": patch
"@praxisjs/composables": patch
"@praxisjs/concurrent": patch
"@praxisjs/devtools": patch
"@praxisjs/vite-plugin": patch
---

Smaller production bundles. The framework and feature packages are marked `"sideEffects": false`, so bundlers leave out the modules an app does not use (`For`/`Index` and `selector()` were kept in every bundle by their shape keepers). `@praxisjs/core`'s graph gates its observer instrumentation on a boolean that minifiers fold away when no observer is ever installed. `@praxisjs/runtime` passes `Index`'s positional update to the list view, so `For`-only apps leave it out, and builds its event prop table from camel-case names. `@praxisjs/devtools` is built one file per module and its decorators check `process.env.NODE_ENV` inline, so `@Trace`/`@Debug` in production code no longer bundle the registry and the panel. `@praxisjs/vite-plugin` serves TypeScript's decorator helpers and the claimed fields' helper from one virtual module (`virtual:praxisjs/decorators`) instead of writing them into every decorated file, and replaces the identical copies `tsc` wrote into ES module libraries.
