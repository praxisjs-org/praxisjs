---
"create-praxisjs": patch
---

Update templates to reflect renamed APIs from `@praxisjs/router` and `@praxisjs/store`:

- `@RouterConfig([...])` → `@Router([...])`
- `@Store()` class decorator → `@Storable()`
- `@UseStore(Class)` field decorator → `@Store(Class)`
