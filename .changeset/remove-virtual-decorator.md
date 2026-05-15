---
"@praxisjs/decorators": major
---

**Breaking:** Remove `@Virtual` class decorator.

`@Virtual` had two fundamental issues that made it unsuitable as a class decorator:

1. **Items were read as a snapshot** — the `items` prop was captured at render time and never updated when the source changed (filtering, live data, external state).
2. **JSX in `renderItem` broke on scroll** — `renderItem` callbacks that used JSX called `getCurrentScope()` inside a plain `effect()` re-run, outside any render scope, causing silent failures.

**Migration:** use `VirtualList` from `@praxisjs/composables` instead. It exposes reactive signals (`visibleItems`, `totalHeight`, `offsetTop`, `offsetBottom`) that the component renders with normal JSX — no `renderItem` convention, full reactivity, and full JSX support.

```tsx
// before
@Virtual(48, 5)
@Component()
class MyList extends StatefulComponent {
  @Prop() items: Row[] = []
  renderItem(row: Row) { return <div style="height:48px">{row.name}</div> }
  render() { return <div /> }
}

// after
import { VirtualList, type VirtualItem } from '@praxisjs/composables'
import { getter } from '@praxisjs/decorators'

@Component()
class MyList extends StatefulComponent {
  @Prop() items: Row[] = []
  containerRef = { current: null as HTMLDivElement | null }

  @Compose(VirtualList, 'containerRef', getter('items'), 48, 5)
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
