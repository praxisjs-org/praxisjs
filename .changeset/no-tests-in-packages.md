---
"@praxisjs/ssg": patch
"@praxisjs/storybook": patch
"@praxisjs/vite-plugin": patch
"@praxisjs/devtools": patch
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
"@praxisjs/shared": patch
"@praxisjs/composables": patch
"@praxisjs/concurrent": patch
"@praxisjs/css": patch
---

Published packages no longer contain their tests: package builds compile `src` without `src/**/__tests__` (through a `tsconfig.build.json`), and each package's `files` leaves test sources and stale compiled tests out of the tarball. `pnpm typecheck` still type-checks the tests.
