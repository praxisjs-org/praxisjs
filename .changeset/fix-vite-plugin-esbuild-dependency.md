---
"@praxisjs/vite-plugin": patch
---

Move `esbuild` from `devDependencies` to `dependencies`. It's imported at runtime by the CSS extraction step, so it was missing from `node_modules` in consumer projects (e.g. `create-praxisjs` scaffolds), causing `ERR_MODULE_NOT_FOUND: esbuild` on `vite dev`/`vite build`.
