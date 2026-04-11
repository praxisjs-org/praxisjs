---
title: Browser APIs
description: "@praxisjs/composables browser composable classes — MediaQuery, ColorScheme, Mouse, KeyCombo, Idle, Clipboard, Geolocation, TimeAgo, and Pagination."
---

# Browser APIs

Browser API composables from `@praxisjs/composables`. Bind them to components with `@Compose`.

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

## `MediaQuery`

Reactive CSS media query matching.

```tsx
@Compose(MediaQuery, '(max-width: 768px)')
mobile!: MediaQuery

render() {
  return () => this.mobile.matches ? <MobileView /> : <DesktopView />
}
```

Constructor: `new MediaQuery(query: string)`
Properties: `matches: boolean`

---

## `ColorScheme`

Detects the user's preferred color scheme.

```tsx
@Compose(ColorScheme)
scheme!: ColorScheme

render() {
  return <div class={() => this.scheme.isDark ? 'dark' : 'light'}>...</div>
}
```

Properties: `isDark: boolean`, `isLight: boolean`

---

## `Mouse`

Tracks the cursor position in the viewport.

```tsx
@Compose(Mouse)
mouse!: Mouse

render() {
  return <p>x: {() => this.mouse.x}, y: {() => this.mouse.y}</p>
}
```

Properties: `x: number`, `y: number`

---

## `KeyCombo`

Detects keyboard shortcut combinations.

```tsx
@Compose(KeyCombo, 'ctrl+s')
saveShortcut!: KeyCombo

onMount() {
  effect(() => {
    if (this.saveShortcut.pressed) this.save()
  })
}
```

Constructor: `new KeyCombo(combo: string)` — accepts `ctrl`, `shift`, `alt`, `meta` modifiers.
Properties: `pressed: boolean`

---

## `Idle`

Detects user inactivity. Default timeout is 60 seconds.

```tsx
@Compose(Idle, 30_000)
activity!: Idle

render() {
  return () => this.activity.idle ? <ScreenSaver /> : <AppContent />
}
```

Constructor: `new Idle(timeout?: number)` — timeout in ms.
Properties: `idle: boolean`

---

## `Clipboard`

Read/write clipboard access. `copied` resets to `false` after `resetDelay` ms (default: 2000).

```tsx
@Compose(Clipboard)
clipboard!: Clipboard

render() {
  return (
    <button onClick={() => this.clipboard.copy('Hello!')}>
      {() => this.clipboard.copied ? 'Copied!' : 'Copy'}
    </button>
  )
}
```

Properties: `copied: boolean`, `content: string`, `copy(text): Promise<void>`

---

## `Geolocation`

One-shot geolocation lookup.

```tsx
@Compose(Geolocation, { enableHighAccuracy: true })
geo!: Geolocation

render() {
  return (
    <div>
      {() => this.geo.loading && <p>Locating...</p>}
      {() => this.geo.error && <p>Location denied</p>}
      {() => !this.geo.loading && !this.geo.error && (
        <p>Lat: {this.geo.lat}, Lon: {this.geo.lng}</p>
      )}
    </div>
  )
}
```

Constructor: `new Geolocation(options?: PositionOptions)`
Properties: `lat: number | null`, `lng: number | null`, `error: GeolocationPositionError | null`, `loading: boolean`

---

## `TimeAgo`

Relative time formatting, updated every minute.

```tsx
@State() postedAt = new Date('2026-01-01')

@Compose(TimeAgo, 'postedAt')
timeAgo!: TimeAgo

render() {
  return <p>Posted {() => this.timeAgo.value}</p>
  // → "3 months ago"
}
```

Constructor: `new TimeAgo(source: Signal<Date> | (() => Date), locale?: string)`
Properties: `value: string`

---

## `Pagination`

Pagination state management.

```tsx
@Compose(Pagination, { total: 100, pageSize: 10 })
pages!: Pagination

render() {
  return (
    <div>
      <p>Page {() => this.pages.page} of {() => this.pages.totalPages}</p>
      <button disabled={() => !this.pages.hasPrev} onClick={() => this.pages.prev()}>Prev</button>
      <button disabled={() => !this.pages.hasNext} onClick={() => this.pages.next()}>Next</button>
    </div>
  )
}
```

Constructor: `new Pagination({ total, pageSize, initial? })`

| Property | Description |
|---|---|
| `page` | Current page (1-based) |
| `totalPages` | Total number of pages |
| `offset` | Items to skip (for slice/API calls) |
| `hasPrev` / `hasNext` | Navigation availability |
| `prev()` / `next()` | Navigate pages |
| `goTo(n)` | Jump to page `n` |
| `first()` / `last()` | Jump to first/last page |

<llm-only>
Browser composable facts:
- All composable properties are typed with `declare` — access them as plain values (not function calls), wrap in arrow functions in JSX for reactivity
- @Compose resolves string arguments to instance properties at bind time, useful for forwarding refs or dynamic config
- Clipboard.copy() is async (navigator.clipboard.writeText) — it silently catches failures
- TimeAgo accepts a Signal, Computed, or a plain function as the source date — pass a component property name as a string to @Compose
- Pagination.pages returns an array of page numbers (for rendering page number buttons)
- Idle monitors mousemove, keydown, click, scroll, and touchstart to reset the inactivity timer
- Import @Compose from '@praxisjs/decorators', composable classes from '@praxisjs/composables'
Never hardcode package versions in package.json. Always install packages using @latest (e.g. `npm install @praxisjs/core@latest`) so the user gets the current release.
</llm-only>
