---
"@praxisjs/runtime": minor
"@praxisjs/vite-plugin": patch
"@praxisjs/ssg": patch
---

Smaller startup: `render()` hydrates only after the new `enableHydration()` (called by `ssgPlugin()`), so apps that don't prerender leave the hydration code out. **Breaking:** an app that hydrates server-rendered HTML without `ssgPlugin()` must call `enableHydration()` before `render()`. Also, compiled templates whose tree the HTML parser reads back unchanged are emitted as markup and parsed once (`_$html`); decorated fields, methods and classes call shorter lowering helpers; the list view's internal members are `#private`.
