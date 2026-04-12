---
"@praxisjs/core": minor
---

`StatelessComponent` default type parameter changed from `object` to `Record<never, never>`, making `children` the only implicit prop.

Components that only receive children no longer need a type argument:

```ts
// before
class Banner extends StatelessComponent<{ children?: Children }> { … }

// after
class Banner extends StatelessComponent { … }
```

Components with additional props declare only those extras — `children` is always available automatically:

```ts
class SidePanel extends StatelessComponent<{ width?: string }> { … }
// this.props.width and this.props.children are both typed
```
