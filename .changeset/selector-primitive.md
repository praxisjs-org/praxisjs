---
"@praxisjs/core": minor
"@praxisjs/decorators": minor
---

Add a keyed selection primitive. `selector(source, equals?)` in `@praxisjs/core/internal` and the `@Selector(field, { equals })` field decorator expose `isSelected(key)`, whose subscribers are grouped by key: a change to the source re-runs only the effects that read the previous or the next key, instead of every row comparing against it. Key buckets and the source subscription are released when their effects are disposed.
