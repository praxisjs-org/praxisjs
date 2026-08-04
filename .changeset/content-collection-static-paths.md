---
"@praxisjs/content": minor
---

Add `collectionStaticPaths(Schema)` — builds a `@praxisjs/ssg`-compatible per-route `getStaticPaths` directly from a collection, substituting each entry's `slug` into the route's one dynamic segment. Removes the need to hand-write a `getCollection(...).map(...)` for the common case of a dynamic route backed 1:1 by a content collection.
