---
"@praxisjs/vite-plugin": patch
---

Fix `praxisjsCSS()` build-time extraction treating tsconfig path aliases (e.g. `@/lib/tokens`, mapped via `compilerOptions.paths`) as external npm packages. The extraction sandbox resolved these to an empty stub instead of the real local file, silently dropping the CSS of any `Stylesheet` that imported values (most commonly design tokens) through an alias. Aliased imports are now resolved through esbuild's own tsconfig-aware resolver instead of being externalized.
