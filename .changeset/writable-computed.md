---
"@praxisjs/decorators": minor
"@praxisjs/core": minor
"@praxisjs/shared": minor
"@praxisjs/runtime": minor
---

Add writable computed: `@Computed({ set })`, `@Computed({ get, set })` on `accessor` fields, and `writableComputed()`.

`@Computed` now accepts an optional `set` function. Assigning to the decorated property calls the setter with the component instance as `this`, letting you write back to the underlying signals while keeping the getter as a reactive cached `computed()`.

For full TypeScript compatibility without a cast, pass both `get` and `set` to the decorator and declare the field with the `accessor` keyword — TypeScript treats `accessor` fields as read-write.

`writableComputed(getter, setter)` is also available from `@praxisjs/core/internal` for use in `Composable` patterns that don't use decorators. The `WritableComputed<T>` type is exported from `@praxisjs/shared`.

---

`onError` can now return `Node | Node[] | null` to mount fallback DOM.

Previously `onError` was `void`-only — it could log or update state, but couldn't directly control what rendered when a component failed.

`onError(error: Error): Node | Node[] | null | undefined` — if a node or array is returned, the runtime mounts it in place of the failed render output. Return `null` or `undefined` to render nothing (preserves existing behavior).

```tsx
@Component()
class SafeCard extends StatefulComponent {
  onError(err: Error) {
    return <p class="error-fallback">Failed to load: {err.message}</p>
  }

  render() {
    return <Card data={this.data} />
  }
}
```
