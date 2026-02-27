# @verbose/composables

::: code-group

```sh [npm]
npm install @verbose/composables
```

```sh [pnpm]
pnpm add @verbose/composables
```

```sh [yarn]
yarn add @verbose/composables
```

:::

Composition utilities for DOM, browser APIs, and common UI patterns. All return reactive signals or computed values.

## DOM

### `createRef<T>()`

Creates a reference object to be attached to a DOM element via the `ref` prop.

```tsx
import { createRef } from '@verbose/composables'

const inputRef = createRef<HTMLInputElement>()

// In render:
<input ref={inputRef} />

// After mount:
inputRef.current?.focus()
```

### `useElementSize(ref)`

Tracks the rendered size of an element using `ResizeObserver`.

```ts
import { createRef, useElementSize } from '@verbose/composables'

const ref = createRef<HTMLDivElement>()
const { width, height, stop } = useElementSize(ref)

// width.value and height.value update on resize
```

| Return | Type | Description |
|--------|------|-------------|
| `width` | `Computed<number>` | Element width in px |
| `height` | `Computed<number>` | Element height in px |
| `stop()` | `() => void` | Disconnect observer |

### `useWindowSize()`

Tracks the browser window dimensions.

```ts
import { useWindowSize } from '@verbose/composables'

const { width, height } = useWindowSize()
// width.value, height.value update on resize
```

### `useScrollPosition(target?)`

Tracks scroll position of an element or the window.

```ts
import { useScrollPosition } from '@verbose/composables'

const { x, y } = useScrollPosition()           // window scroll
const { x, y } = useScrollPosition(el)         // element scroll
```

### `useIntersection(ref, options?)`

Returns a `Computed<boolean>` that is `true` when the element enters the viewport.

```ts
import { useIntersection } from '@verbose/composables'

const isVisible = useIntersection(ref, { threshold: 0.5 })
```

### `useFocus(ref)`

Returns a `Computed<boolean>` reflecting the focus state of an element.

```ts
import { useFocus } from '@verbose/composables'

const focused = useFocus(inputRef)
```

---

## Browser APIs

### `useMediaQuery(query)`

Matches a CSS media query and returns a reactive boolean.

```ts
import { useMediaQuery } from '@verbose/composables'

const isTablet = useMediaQuery('(min-width: 768px)')
// isTablet.value updates when the query result changes
```

### `useColorScheme()`

Detects the user's preferred color scheme.

```ts
import { useColorScheme } from '@verbose/composables'

const { isDark, isLight } = useColorScheme()
```

### `useMouse()`

Tracks the cursor position in page coordinates.

```ts
import { useMouse } from '@verbose/composables'

const { x, y } = useMouse()
```

### `useKeyCombo(combo)`

Detects a keyboard shortcut being held down.

```ts
import { useKeyCombo } from '@verbose/composables'

const isSaving = useKeyCombo('ctrl+s')
const isUndo = useKeyCombo('ctrl+z')
```

Combo syntax: modifier keys joined with `+` followed by the key name. Modifiers: `ctrl`, `shift`, `alt`, `meta`.

### `useIdle(timeout?)`

Detects user inactivity. Resets on mouse, keyboard, touch, or scroll events.

```ts
import { useIdle } from '@verbose/composables'

const idle = useIdle(30_000)  // 30 seconds, default is 60s
// idle.value === true when user has been inactive
```

---

## Utilities

### `useClipboard(resetDelay?)`

Provides clipboard read/write with a reactive `copied` flag.

```ts
import { useClipboard } from '@verbose/composables'

const { copy, copied, content } = useClipboard(2000)

await copy('Hello!')
copied.value   // true for 2 seconds
content.value  // 'Hello!'
```

| Return | Type | Description |
|--------|------|-------------|
| `copy(text)` | `(string) => Promise<void>` | Write to clipboard |
| `copied` | `Computed<boolean>` | True for `resetDelay` ms after copy |
| `content` | `Computed<string>` | Last copied text |

### `useGeolocation(options?)`

Requests the user's geolocation reactively.

```ts
import { useGeolocation } from '@verbose/composables'

const { lat, lng, error, loading } = useGeolocation()
```

| Return | Type | Description |
|--------|------|-------------|
| `lat` | `Computed<number \| null>` | Latitude |
| `lng` | `Computed<number \| null>` | Longitude |
| `error` | `Computed<GeolocationPositionError \| null>` | Position error |
| `loading` | `Computed<boolean>` | Request in progress |

### `useTimeAgo(source, locale?)`

Formats a date signal as a human-readable relative time string. Defaults to `pt-BR` locale.

```ts
import { signal } from '@verbose/core'
import { useTimeAgo } from '@verbose/composables'

const date = signal(new Date(Date.now() - 3600_000))
const label = useTimeAgo(date)
// label.value === '1 hora atrás'

const labelEn = useTimeAgo(date, 'en-US')
// labelEn.value === '1 hour ago'
```

### `usePagination(options)`

Manages pagination state for a list.

```ts
import { usePagination } from '@verbose/composables'

const pager = usePagination({ total: 100, pageSize: 10, initial: 1 })

pager.page.value       // 1
pager.totalPages.value // 10
pager.hasNext.value    // true
pager.offset.value     // 0

pager.next()           // page → 2
pager.goTo(5)          // page → 5
pager.last()           // page → 10
pager.prev()           // page → 9
pager.first()          // page → 1
```

`options` can also be a function that returns options reactively.

| Return | Type | Description |
|--------|------|-------------|
| `page` | `Computed<number>` | Current page (1-based) |
| `totalPages` | `Computed<number>` | Total number of pages |
| `offset` | `Computed<number>` | Item offset for current page |
| `pageSize` | `Computed<number>` | Items per page |
| `hasNext` | `Computed<boolean>` | Whether next page exists |
| `hasPrev` | `Computed<boolean>` | Whether previous page exists |
| `pages` | `Computed<number[]>` | Array of page numbers |
| `next()` | `() => void` | Go to next page |
| `prev()` | `() => void` | Go to previous page |
| `goTo(p)` | `(number) => void` | Jump to a specific page |
| `first()` | `() => void` | Go to first page |
| `last()` | `() => void` | Go to last page |
