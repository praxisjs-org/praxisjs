---
"@praxisjs/core": minor
"create-praxisjs": patch
---

`StatelessComponent` now exposes an optional typed `children` prop. Accessing `this.props.children` is now valid without declaring `children` in the generic type parameter `T`.
