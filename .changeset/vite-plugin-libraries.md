---
"@praxisjs/vite-plugin": minor
---

Compile PraxisJS libraries like the app's own code. A library opts in with `"praxisjs": { "optimize": true }` in its package.json: the decorated fields of its tsc-compiled files are claimed (fast properties). With `rootDir` and `outDir` and its sources shipped, its sources are compiled instead, with compiled templates and keyed lists. The new `libraries` option opts packages in or out by name. The transforms also run in Vite's dependency optimizer, and libraries that opt in are added to `ssr.noExternal`. Packages that don't opt in are unchanged.
