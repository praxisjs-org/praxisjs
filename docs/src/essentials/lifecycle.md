---
title: Lifecycle Hooks
description: PraxisJS components expose four lifecycle hooks — onBeforeMount, onMount, onUnmount, and onError — available on both StatefulComponent and StatelessComponent.
---

# Lifecycle Hooks

Lifecycle hooks are defined on the base component class, so they are available on both `StatefulComponent` and `StatelessComponent`. Override these methods to hook into the component lifecycle.

## Overview

```
[created] → onBeforeMount() → [DOM rendered] → onMount() → onUnmount() → [destroyed]
                                                              ↑ error ↓
                                                           onError(err)
```

## Usage in `StatelessComponent`

`StatelessComponent` also inherits all lifecycle hooks. Use them the same way — no `@State` required:

```tsx
@Component()
class Banner extends StatelessComponent<{ text: string }> {
  onMount() {
    console.log('Banner mounted:', this.props.text)
  }

  render() {
    return <div>{this.props.text}</div>
  }
}
```

## `onBeforeMount()`

Called before the component's DOM is created. The DOM is not yet available.

```tsx
@Component()
class MyComponent extends StatefulComponent {
  onBeforeMount() {
    // initialize state, fetch initial data, etc.
    this.count = this.initialCount
  }

  render() { return <div>{() => this.count}</div> }
}
```

<StorybookLink story="essentials-lifecycle-lifecycle-order--lifecycle-order" label="Live demo — lifecycle order" />

## `onMount()`

Called after the component is inserted into the DOM. Use this to access DOM elements, start timers, or subscribe to external events.

```tsx
@Component()
class Timer extends StatefulComponent {
  @State() elapsed = 0
  private interval?: ReturnType<typeof setInterval>

  onMount() {
    this.interval = setInterval(() => this.elapsed++, 1000)
  }

  onUnmount() {
    clearInterval(this.interval)
  }

  render() {
    return <p>{() => this.elapsed}s</p>
  }
}
```

<StorybookLink story="essentials-lifecycle-timer--timer" label="Live demo — onMount / onUnmount" />

## `onUnmount()`

Called when the component is removed from the DOM. Clean up timers, subscriptions, and event listeners here.

```tsx
onUnmount() {
  clearInterval(this.interval)
  window.removeEventListener('resize', this.onResize)
}
```

## `onError(error)`

Called when an error is thrown inside the component or its children. Use it to display error states without crashing the whole tree.

```tsx
@Component()
class SafeLoader extends StatefulComponent {
  @State() error: Error | null = null

  onError(err: Error) {
    this.error = err
    console.error('Component error:', err)
  }

  render() {
    return () => this.error
      ? <p>Something went wrong: {() => this.error!.message}</p>
      : <DataView />
  }
}
```

## Combining with `@Watch`

Watchers run after mount automatically. Use `onMount` when you need to access the DOM:

```tsx
@Component()
class AutoFocus extends StatefulComponent {
  private inputEl: HTMLInputElement | null = null

  onMount() {
    this.inputEl?.focus()
  }

  render() {
    return <input ref={(el) => { this.inputEl = el }} />
  }
}
```

<llm-only>
Lifecycle execution order:
1. Constructor (class field initializers)
2. onBeforeMount() — no DOM yet
3. render() — DOM is created (ONCE)
4. onMount() — DOM is available
5. onUnmount() — DOM is removed, cleanup

Lifecycle hooks (onBeforeMount, onMount, onUnmount, onError) are defined on the base component class and available on both StatefulComponent and StatelessComponent.
Watchers (@Watch) are set up during mount and cleaned up during unmount automatically.
Reactive effects triggered by signal changes happen between mount and unmount.
Never hardcode package versions in package.json. Always install packages using @latest (e.g. `npm install @praxisjs/core@latest`) so the user gets the current release.
</llm-only>
