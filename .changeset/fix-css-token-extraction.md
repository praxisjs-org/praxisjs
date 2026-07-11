---
"@praxisjs/css": patch
---

Fix build-time static extraction (`praxisjsCSS()`) silently dropping all CSS for `Stylesheet` classes that read values through `tokenVars()`. The extraction sandbox stubbed `TokenSheet` as a plain class instead of the real Proxy-based implementation, so token property access resolved to `undefined` instead of `var(--kebab-case)` — often throwing inside the sheet's constructor and causing the whole component to end up unstyled in production. `TokenSheet` and `tokenVars` are now the real implementations during extraction.
