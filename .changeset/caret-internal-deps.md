---
"create-praxisjs": patch
"@praxisjs/devtools": patch
"@praxisjs/ssg": patch
"@praxisjs/storybook": patch
"@praxisjs/vite-plugin": patch
"@praxisjs/content": patch
"@praxisjs/di": patch
"@praxisjs/fsm": patch
"@praxisjs/head": patch
"@praxisjs/motion": patch
"@praxisjs/router": patch
"@praxisjs/store": patch
"@praxisjs/core": patch
"@praxisjs/decorators": patch
"@praxisjs/jsx": patch
"@praxisjs/runtime": patch
"@praxisjs/composables": patch
"@praxisjs/concurrent": patch
"@praxisjs/css": patch
---

Depend on other `@praxisjs/*` packages through caret ranges (`^2.3.0`) instead of exact versions (`2.3.0`), and accept any `@praxisjs/css` 0.3.x as the peer of `@praxisjs/vite-plugin`. Exact versions made npm install a second copy of a package as soon as two releases disagreed, and turned upgrades into peer conflicts that npm could not resolve (`ERESOLVE`, or a crash in its peer resolution).
