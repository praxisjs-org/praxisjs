---
"@praxisjs/decorators": patch
---

`@Resource` now accepts a self-receiving fetcher as an alternative to the zero-argument arrow function.

When the fetcher accepts one argument, the component instance is passed automatically at bind time — signal reads on `self` become reactive dependencies and TypeScript knows the type:

```tsx
// before — arrow function, 'this' was module scope (undefined)
@Resource(() => fetch(`/api/posts?page=${this.page}`).then(r => r.json()))

// after — receive the instance as 'self'
@Resource((self: PostList) => fetch(`/api/posts?page=${self.page}`).then(r => r.json()))
posts!: ResourceInstance<Post[]>
```

The zero-argument form is unchanged and continues to work for fetchers with no component dependency.
