---
title: DOM Utilities
description: "@praxisjs/composables DOM composable classes — WindowSize, ScrollPosition, ElementSize, Intersection, and Focus. Used via the @Compose decorator."
---

# DOM Utilities

DOM composables from `@praxisjs/composables`. Use them with the `@Compose` decorator to bind reactive DOM state directly to component properties.

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

```sh [bun]
bun add @praxisjs/composables
```

:::

## `WindowSize`

Tracks the browser window's inner dimensions.

```tsx
import { Compose } from '@praxisjs/decorators'
import { WindowSize } from '@praxisjs/composables'

@Component()
class App extends StatefulComponent {
  @Compose(WindowSize)
  window!: WindowSize

  render() {
    return <p>Viewport: {() => this.window.width} × {() => this.window.height}</p>
  }
}
```

Properties: `width: number`, `height: number`

---

## `ScrollPosition`

Tracks scroll position. Pass an element to track its scroll, or omit for the window.

```tsx
@Compose(ScrollPosition)
scroll!: ScrollPosition

// Track a specific element:
@Compose(ScrollPosition, document.getElementById('feed'))
feedScroll!: ScrollPosition
```

Properties: `x: number`, `y: number`

---

## `ElementSize`

Tracks an element's dimensions via `ResizeObserver`.

```tsx
@Component()
class ResizeWatcher extends StatefulComponent {
  containerRef = { current: null as HTMLDivElement | null }

  @Compose(ElementSize, 'containerRef')
  size!: ElementSize

  render() {
    return (
      <div ref={(el) => { this.containerRef.current = el }}>
        <p>Width: {() => this.size.width}, Height: {() => this.size.height}</p>
      </div>
    )
  }
}
```

String arguments to `@Compose` resolve to instance properties at bind time.

Properties: `width: number`, `height: number`

---

## `Intersection`

Tracks whether an element is in the viewport via `IntersectionObserver`.

```tsx
@Component()
class LazySection extends StatefulComponent {
  sectionRef = { current: null as HTMLElement | null }

  @Compose(Intersection, 'sectionRef', { threshold: 0.5 })
  visibility!: Intersection

  render() {
    return (
      <section ref={(el) => { this.sectionRef.current = el }}>
        {() => this.visibility.visible ? <HeavyContent /> : <Placeholder />}
      </section>
    )
  }
}
```

Constructor: `new Intersection(ref, options?)` — `options` matches `IntersectionObserverInit`.

Properties: `visible: boolean`

---

## `Focus`

Tracks whether an element currently has focus.

```tsx
@Component()
class SearchBar extends StatefulComponent {
  inputRef = { current: null as HTMLInputElement | null }

  @Compose(Focus, 'inputRef')
  focus!: Focus

  render() {
    return (
      <div>
        <input ref={(el) => { this.inputRef.current = el }} />
        {() => this.focus.focused && <span>Typing...</span>}
      </div>
    )
  }
}
```

Properties: `focused: boolean`

<llm-only>
DOM composable facts:
- All composables use `declare propName: type` for typed properties — the actual reactive getters are set up at runtime by @Compose
- Access composable properties directly (e.g. `this.size.width`), not as function calls — they are plain property getters that read the underlying signal
- Still wrap in arrow functions in JSX to stay reactive: `{() => this.size.width}`
- String arguments to @Compose (e.g. `@Compose(ElementSize, 'containerRef')`) resolve to instance properties at bind time — useful for passing refs
- All observers (ResizeObserver, IntersectionObserver) are cleaned up automatically via onUnmount
- Import @Compose from '@praxisjs/decorators', composable classes from '@praxisjs/composables'
Never hardcode package versions in package.json. Always install packages using @latest (e.g. `npm install @praxisjs/core@latest`) so the user gets the current release.
</llm-only>
