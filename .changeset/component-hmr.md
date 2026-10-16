---
"@praxisjs/runtime": minor
"@praxisjs/vite-plugin": minor
---

Component hot module replacement. In the dev server, `@praxisjs/vite-plugin` registers each top-level class of the app's modules with `@praxisjs/runtime` (`_$hmrRegister`), and a module whose exports are all component classes accepts its own update: every mounted instance of an edited component renders again in place with the new class, without a page reload. Modules that export anything else keep Vite's default handling.
