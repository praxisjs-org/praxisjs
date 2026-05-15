---
title: List Utilities
description: "@praxisjs/composables list utilities — VirtualList for virtualizing large lists with reactive scroll tracking."
---

# List Utilities

## `VirtualList`

Virtualizes large lists — only the rows in the visible viewport (plus `buffer` rows on each side) are in the DOM at any time. Dramatically reduces DOM node count for long lists.

Unlike a class decorator, `VirtualList` is a composable: it exposes reactive signals that the component renders with normal JSX. This means:
- `renderItem` callbacks use standard JSX with full scope support
- The items source reacts to external changes (filtering, sorting, live data)
- No special convention required on the component

::: code-group

```sh [npm]
npm install @praxisjs/composables
```

```sh [pnpm]
pnpm add @praxisjs/composables
```

```sh [yarn]
yarn add @praxisjs/composables
```

:::

## Basic usage

```tsx
import { VirtualList, type VirtualItem } from '@praxisjs/composables'
import { Compose, getter } from '@praxisjs/decorators'

interface User { id: number; name: string; email: string }

@Component()
class UserTable extends StatefulComponent {
  @Prop() items: User[] = []

  containerRef = { current: null as HTMLDivElement | null }

  @Compose(VirtualList, 'containerRef', getter('items'), 48, 5)
  virtual!: VirtualList<User>

  render() {
    return (
      <div
        ref={(el) => { this.containerRef.current = el }}
        style="height:400px;overflow-y:auto"
      >
        <div style={() => `height:${this.virtual.totalHeight}px;position:relative`}>
          <div style={() => `height:${this.virtual.offsetTop}px`} />
          {() => (this.virtual.visibleItems as VirtualItem<User>[]).map(({ item }) => (
            <div key={item.id} style="height:48px;display:flex;align-items:center;padding:0 16px">
              <strong>{item.name}</strong>
              <span>{item.email}</span>
            </div>
          ))}
          <div style={() => `height:${this.virtual.offsetBottom}px`} />
        </div>
      </div>
    )
  }
}
```

The inner structure uses three stacked elements: a top spacer, the visible items slice, and a bottom spacer. Together they fill the total scroll height while only a small window is in the DOM.

<StorybookLink story="decorators-performance-virtuallist--virtual-list-story" label="Live demo — VirtualList" />

---

## Reactive items

Pass a reactive source via `getter('propName')` so the visible window updates when items change (filtering, sorting, live data):

```tsx
@State() filter = ''

get filteredUsers(): User[] {
  return this.filter
    ? USERS.filter(u => u.name.toLowerCase().includes(this.filter))
    : USERS
}

@Compose(VirtualList, 'containerRef', getter('filteredUsers'), 48, 5)
virtual!: VirtualList<User>
```

When `filter` changes, `filteredUsers` recomputes → `VirtualList` sees the new items → `visibleItems`, `totalHeight`, `offsetTop`, `offsetBottom` update reactively → DOM patches only the affected nodes.

---

## Constructor arguments

```ts
new VirtualList(containerRef, getItems, itemHeight, buffer?)
```

| Argument | Type | Description |
|---|---|---|
| `containerRef` | `{ current: HTMLElement \| null }` | Ref to the scroll container |
| `getItems` | `() => T[]` | Reactive items source — pass via `getter('propName')` |
| `itemHeight` | `number` | Fixed height of each row in pixels |
| `buffer` | `number` | Extra rows to render above/below the visible area (default: `3`) |

---

## Exposed properties

| Property | Type | Description |
|---|---|---|
| `visibleItems` | `VirtualItem<T>[]` | Items currently in the visible window (+ buffer) |
| `totalHeight` | `number` | Total scroll height (`items.length × itemHeight`) |
| `offsetTop` | `number` | Height of the invisible top spacer |
| `offsetBottom` | `number` | Height of the invisible bottom spacer |

`VirtualItem<T>` has `{ item: T; index: number }`.

All four properties are reactive — reading them inside `{() => ...}` in JSX or a `@Watch` creates subscriptions.

---

## `@Compose` with `getter()`

`@Compose` passes string arguments as property name references. Use `getter('propName')` when the composable needs a live getter — it resolves to `() => instance[propName]` at bind time:

```tsx
import { getter } from '@praxisjs/decorators'

// ✅ reactive — VirtualList receives () => this.items, tracks signal changes
@Compose(VirtualList, 'containerRef', getter('items'), 48)
virtual!: VirtualList<Item>

// ❌ would pass the current array value as a snapshot
@Compose(VirtualList, 'containerRef', 'items', 48)
```

<llm-only>
VirtualList facts:
- Exported from '@praxisjs/composables' along with VirtualItem type
- Constructor: (containerRef: { current: HTMLElement | null }, getItems: () => T[], itemHeight: number, buffer = 3)
- Pass containerRef as string name 'containerRef' to @Compose — resolves to instance.containerRef
- Pass getItems via getter('propName') from @praxisjs/decorators — resolves to () => instance[propName]
- Exposed reactive properties: visibleItems: VirtualItem<T>[], totalHeight: number, offsetTop: number, offsetBottom: number
- VirtualItem<T> = { item: T; index: number }
- The scroll container needs overflow-y:auto/scroll and a fixed height — VirtualList handles the scroll event internally
- onMount reads containerRef.current to get container height and set up scroll listener
- Items are rendered using normal JSX inside {() => this.virtual.visibleItems.map(...)} — no renderItem convention
- The outer div must have style={() => `height:${this.virtual.totalHeight}px;position:relative`}
- Inner structure: spacer-top div (offsetTop) + items + spacer-bottom div (offsetBottom)
Never hardcode package versions in package.json. Always install packages using @latest (e.g. `npm install @praxisjs/core@latest`) so the user gets the current release.
</llm-only>
