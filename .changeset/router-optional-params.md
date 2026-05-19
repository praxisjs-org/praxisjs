---
"@praxisjs/router": minor
---

Route paths now support optional segments with the `:param?` syntax.

Appending `?` to any named segment makes it optional — the router matches both the path with the segment present and the path with it absent. When a segment is absent, its param value defaults to `""`.

```ts
@Router([
  { path: '/posts/:slug?', component: PostPage },
])
```

- `/posts/hello-world` → `params().slug === 'hello-world'`
- `/posts/` → `params().slug === ''`
