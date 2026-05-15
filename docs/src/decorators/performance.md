---
title: Performance Decorators
description: Optimize rendering with @Lazy for viewport-deferred components. For large list virtualization, see VirtualList composable.
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

<StorybookLink story="decorators-performance-lazy--lazy-story" label="Live demo — @Lazy" />

To scope intersection to a specific scroll container instead of the viewport, pass an options object:

```tsx
const listRef = { current: null as HTMLDivElement | null }

@Lazy({ placeholder: 300, root: listRef, rootMargin: '0px' })
@Component()
class HeavyChart extends StatefulComponent { ... }

// in render:
<div ref={(el) => { listRef.current = el }} style="overflow-y:auto;height:400px">
  <HeavyChart />
</div>
```

| Option | Type | Default | Description |
|---|---|---|---|
| `placeholder` | `number` | `200` | Placeholder height in px |
| `root` | `{ current: HTMLElement \| null }` | `null` (viewport) | Scroll container to observe against |
| `rootMargin` | `string` | `"100px"` | Extra margin before triggering |

**Use cases:** components below the fold, heavy visualizations, third-party widgets.

---

## Large list virtualization

For large list virtualization, use the [`VirtualList` composable](/composables/list) from `@praxisjs/composables`. It exposes reactive signals (`visibleItems`, `totalHeight`, `offsetTop`, `offsetBottom`) that the component renders with normal JSX — no custom `renderItem` convention needed, and items react to external changes automatically.

→ See [VirtualList](/composables/list) for full details and examples.

<llm-only>
@Lazy internals: uses IntersectionObserver to detect when the placeholder enters the viewport, then swaps to the real component.
The real component is rendered via a reactive thunk returned from the render() enhancement — the runtime tracks the visible signal and patches the DOM when IntersectionObserver fires.

Both @Lazy and @Component() use createClassDecorator. They can be stacked safely — @Lazy must appear ABOVE @Component() in the decorator stack (decorators apply bottom-up).

Large list virtualization: use VirtualList composable from @praxisjs/composables, NOT the old @Virtual decorator (removed). VirtualList exposes visibleItems, totalHeight, offsetTop, offsetBottom as reactive signals; the component renders the slice with normal JSX using @Compose(VirtualList, ref, getter('items'), itemHeight, buffer).
Never hardcode package versions in package.json. Always install packages using @latest (e.g. `npm install @praxisjs/core@latest`) so the user gets the current release.
</llm-only>
