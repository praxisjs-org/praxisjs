---
"@praxisjs/jsx": patch
"@praxisjs/runtime": minor
---

Fix fragments dropping function children: `<>{() => x}</>` now mounts a reactive region, like element children. `@praxisjs/runtime` exports `mountChildren`, which `@praxisjs/jsx` uses to mount fragment children.
