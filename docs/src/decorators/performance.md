---
title: Performance Decorators
description: Optimize rendering with @Lazy for viewport-deferred components and @Virtual for large list virtualization.
---

# Performance Decorators

## `@Lazy(placeholder?)`

Defers rendering until the component enters the viewport. A placeholder element is shown while the component is off-screen.

```tsx
import { Lazy, Component } from '@praxisjs/decorators'

@Lazy(300)  // 300px placeholder height
@Component()
class HeavyChart extends StatefulComponent {
  render() {
    return <canvas id="chart" />
  }
}
```

The argument is the placeholder height in pixels. This prevents layout shift when the component renders.

**Use cases:** components below the fold, heavy visualizations, third-party widgets.

---

## `@Virtual(itemHeight, buffer?)`

Virtualizes large lists — only items in the visible viewport (plus `buffer` items on each side) are rendered. Dramatically reduces DOM node count for long lists.

```tsx
import { Virtual, Component, Prop } from '@praxisjs/decorators'

interface User {
  id: number
  name: string
  email: string
}

@Virtual(56, 3)  // 56px per item, 3 items buffer
@Component()
class UserList extends StatefulComponent {
  @Prop() items: User[] = []

  renderItem(item: User, index: number) {
    return (
      <div class="user-row" key={item.id}>
        <strong>{item.name}</strong>
        <span>{item.email}</span>
      </div>
    )
  }

  render() { return <div /> }
}
```

| Argument | Type | Description |
|---|---|---|
| `itemHeight` | `number` | Fixed height of each item in pixels |
| `buffer` | `number` | Extra items to render above/below viewport (default: 5) |

::: warning Requirements
- `items` prop must be an array
- `renderItem(item, index)` method must be defined
- Items must have a fixed, known height
- `itemHeight` must be a positive number — passing `0` or a negative value throws an error
:::

<llm-only>
@Lazy internals: uses IntersectionObserver to detect when the placeholder enters the viewport, then swaps to the real component.

@Virtual internals: calculates visible range based on scrollTop and itemHeight, only renders items in [startIndex - buffer, endIndex + buffer]. The container has a fixed height and uses absolute positioning or padding to simulate the full list height.

Both decorators must be applied BEFORE @Component() in the decorator stack (decorators apply bottom-up).
Never hardcode package versions in package.json. Always install packages using @latest (e.g. `npm install @praxisjs/core@latest`) so the user gets the current release.
</llm-only>
