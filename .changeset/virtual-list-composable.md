---
"@praxisjs/composables": minor
---

Add `VirtualList<T>` composable — a signal-based virtual scroll composable that replaces the `@Virtual` class decorator for use cases requiring reactive items and JSX `renderItem`.

**Why composable instead of decorator:** `@Virtual` as a class decorator had two fundamental problems:
1. `items` was read as a snapshot at render time — filtering or external changes were ignored.
2. `renderItem` callbacks using JSX failed on scroll-triggered effect re-runs because `getCurrentScope()` was null outside the render phase.

`VirtualList` solves both by exposing reactive signals that the component renders via normal JSX:

```tsx
import { VirtualList, type VirtualItem } from '@praxisjs/composables'
import { getter } from '@praxisjs/decorators'

@Component()
class UserTable extends StatefulComponent {
  @State() filter = ''
  containerRef = { current: null as HTMLDivElement | null }

  get rows() { return ROWS.filter(r => r.name.includes(this.filter)) }

  @Compose(VirtualList, 'containerRef', getter('rows'), 48, 5)
  virtual!: VirtualList<Row>

  render() {
    return (
      <div ref={(el) => { this.containerRef.current = el }} style="height:400px;overflow-y:auto">
        <div style={() => `height:${this.virtual.totalHeight}px;position:relative`}>
          <div style={() => `height:${this.virtual.offsetTop}px`} />
          {() => (this.virtual.visibleItems as VirtualItem<Row>[]).map(({ item }) => (
            <div style="height:48px">{item.name}</div>
          ))}
          <div style={() => `height:${this.virtual.offsetBottom}px`} />
        </div>
      </div>
    )
  }
}
```

Exposed properties: `visibleItems: VirtualItem<T>[]`, `totalHeight: number`, `offsetTop: number`, `offsetBottom: number`.
