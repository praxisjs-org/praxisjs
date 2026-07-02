---
"@praxisjs/decorators": patch
---

`@FunctionProp()` now logs a `console.warn` in development when the received value isn't a function, instead of silently accepting it.
