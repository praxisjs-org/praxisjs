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

<StorybookLink story="composables-dom-windowsize--window-size-story" label="Live demo — WindowSize" />

---

## `ScrollPosition`

Tracks scroll position. Omit the argument to track the window, or pass a ref to track a specific scrollable element.

```tsx
// Window scroll
@Compose(ScrollPosition)
scroll!: ScrollPosition
```

```tsx
// Specific element — pass a ref string (preferred)
containerRef = { current: null as HTMLDivElement | null }

@Compose(ScrollPosition, 'containerRef')
scroll!: ScrollPosition

render() {
  return (
    <div
      ref={(el) => { this.containerRef.current = el }}
      style="height:300px;overflow:auto"
    >
      {/* scrollable content */}
    </div>
  )
}
```

::: tip Ref vs element directly
Pass the property name as a string (`'containerRef'`) rather than the element itself (`document.getElementById('feed')`). The element doesn't exist at decoration time — a ref object is resolved at mount when the DOM is ready.
:::

Properties: `x: number`, `y: number`

<StorybookLink story="composables-dom-scrollposition--scroll-position-story" label="Live demo — ScrollPosition" />

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

String arguments to `@Compose` resolve to instance properties at bind time. Use `getter('propName')` from `@praxisjs/decorators` when the composable needs a live callable source instead of a snapshot value — see [Constructor arguments](/guide/custom-composables#constructor-arguments) for details.

Properties: `width: number`, `height: number`

<StorybookLink story="composables-dom-elementsize--element-size-story" label="Live demo — ElementSize" />

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

<StorybookLink story="composables-dom-intersection--intersection-story" label="Live demo — Intersection" />

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

<StorybookLink story="composables-dom-focus--focus-story" label="Live demo — Focus" />

<llm-only>
DOM composable facts:
- All composables use `declare propName: type` for typed properties — the actual reactive getters are set up at runtime by @Compose
- Access composable properties directly (e.g. `this.size.width`), not as function calls — they are plain property getters that read the underlying signal
- Still wrap in arrow functions in JSX to stay reactive: `{() => this.size.width}`
- String arguments to @Compose (e.g. `@Compose(ElementSize, 'containerRef')`) resolve to instance properties at bind time — useful for passing refs
- ScrollPosition accepts: no arg (window), string ref name 'propName' → resolves to instance.propName = { current: HTMLElement | null }, or HTMLElement/Window directly. Always prefer string ref to avoid accessing the element at decoration time (DOM not ready yet)
- All observers (ResizeObserver, IntersectionObserver) and event listeners are set up in onMount (after ref callbacks fire) and cleaned up automatically in onUnmount
- Import @Compose from '@praxisjs/decorators', composable classes from '@praxisjs/composables'
Never hardcode package versions in package.json. Always install packages using @latest (e.g. `npm install @praxisjs/core@latest`) so the user gets the current release.
</llm-only>
