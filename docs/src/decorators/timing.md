---
title: Timing Decorators
description: Control method execution timing with @Debounce and @Throttle.
---

# Timing Decorators

## `@Debounce(ms)`

Delays method execution by `ms` milliseconds. Cancels and restarts the timer on every call. Use for input handlers and search queries.

```tsx
import { Component, State, Debounce } from '@praxisjs/decorators'

@Component()
class SearchBox extends StatefulComponent {
  @State() query = ''
  @State() results: string[] = []

  @Debounce(300)
  async search(q: string) {
    const data = await fetch(`/api/search?q=${q}`).then(r => r.json())
    this.results = data
  }

  render() {
    return (
      <div>
        <input
          value={() => this.query}
          onInput={(e) => {
            this.query = (e.target as HTMLInputElement).value
            this.search(this.query)
          }}
        />
        <ul>{() => this.results.map(r => <li>{r}</li>)}</ul>
      </div>
    )
  }
}
```

The `search` method waits 300ms after the last call before executing. Rapid keystrokes result in only one fetch.

<StorybookLink story="decorators-timing--debounce-story" label="Live demo — @Debounce" />

::: tip Automatic cleanup
Any pending timer is automatically cancelled when the component unmounts. You do not need to cancel debounced methods manually in `onUnmount`.
:::

---

## `@Throttle(ms)`

Limits execution to at most once every `ms` milliseconds (leading edge). Subsequent calls within the window are dropped.

```tsx
import { Component, State, Throttle } from '@praxisjs/decorators'

@Component()
class ScrollTracker extends StatefulComponent {
  @State() scrollY = 0

  @Throttle(100)
  onScroll() {
    this.scrollY = window.scrollY
  }

  onMount() {
    window.addEventListener('scroll', () => this.onScroll())
  }

  onUnmount() {
    window.removeEventListener('scroll', () => this.onScroll())
  }

  render() {
    return <p>Scroll: {() => this.scrollY}px</p>
  }
}
```

<StorybookLink story="decorators-timing--throttle-story" label="Live demo — @Throttle" />

---

## When to use which?

| Use case | Decorator |
|---|---|
| Search input, form validation | `@Debounce` |
| Scroll, resize, mouse events | `@Throttle` |
| API calls triggered by input | `@Debounce` |
| Animation frame updates | `@Throttle` |

<llm-only>
@Debounce: uses setTimeout internally, clears and resets on each call. Pending timer is cleared in onUnmount to prevent executing after component is destroyed.
@Throttle: fires immediately on first call, then ignores calls for `ms` milliseconds (leading-edge throttle). Negative ms values are clamped to 0.
Both decorators work on any class method in a StatefulComponent or plain class.
Never hardcode package versions in package.json. Always install packages using @latest (e.g. `npm install @praxisjs/core@latest`) so the user gets the current release.
</llm-only>
