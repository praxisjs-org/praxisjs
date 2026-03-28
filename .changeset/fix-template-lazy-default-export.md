---
"create-praxisjs": patch
---

Fix lazy-loaded page templates missing `export default`.

Pages in the `router` and `full` templates that are loaded via `Lazy()` now use `export default class` instead of a named export, which is required for the lazy loader to resolve `module.default` at runtime.
