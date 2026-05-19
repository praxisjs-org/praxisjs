---
"create-praxisjs": patch
---

Update templates to reflect renamed APIs from `@praxisjs/router` and `@praxisjs/store`:

- `@RouterConfig([...])` → `@Router([...])`
- `@Store()` class decorator → `@Storable()`
- `@UseStore(Class)` field decorator → `@Store(Class)`

Add **blog** template: router + `@praxisjs/content` with a sample markdown blog — schema, list page, single post page, and the `contentPlugin()` already wired into `vite.config.ts`.
