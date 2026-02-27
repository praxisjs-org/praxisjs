# @verbose/decorators

::: code-group

```sh [npm]
npm install @verbose/decorators
```

```sh [pnpm]
pnpm add @verbose/decorators
```

```sh [yarn]
yarn add @verbose/decorators
```

:::

TypeScript decorators for defining components, reactive state, lifecycle hooks, and utilities.

## Component Decorator

### `@Component(options?)`

Marks a class as a Verbose component.

```ts
import { Component, BaseComponent } from '@verbose/decorators'

@Component({ tag: 'my-button', shadow: false })
class MyButton extends BaseComponent {
  render() {
    return <button>{this.props.children}</button>
  }
}
```

| Option | Type | Description |
|--------|------|-------------|
| `tag` | `string` | Custom element tag name (optional) |
| `shadow` | `boolean` | Use shadow DOM (optional) |

---

## Props & State

### `@Prop()`

Declares an external prop. The value comes from the parent; the decorated property acts as the default.

```ts
@Component()
class Card extends BaseComponent {
  @Prop() title = 'Untitled'
  @Prop() elevated = false

  render() {
    return <div class={this.props.elevated ? 'elevated' : ''}>{this.props.title}</div>
  }
}
```

### `@State()`

Declares a reactive signal property. The getter returns the current value; the setter updates the underlying signal.

```ts
@Component()
class Toggle extends BaseComponent {
  @State() open = false

  render() {
    return (
      <button onClick={() => { this.open = !this.open }}>
        {this.open ? 'Close' : 'Open'}
      </button>
    )
  }
}
```

### `getSignal<T>(instance, key)`

Retrieves the underlying `Signal<T>` for a `@State` property, useful when passing it to composables.

```ts
import { getSignal } from '@verbose/decorators'

const countSignal = getSignal<number>(this, 'count')
```

---

## Watching State

### `@Watch(...propNames)`

Observes one or more `@State`, `@Prop`, or `@Computed` properties. The decorated method is called with the new and old values whenever they change.

```ts
import { Watch, WatchVal } from '@verbose/decorators'

@Component()
class Search extends BaseComponent {
  @State() query = ''

  @Watch('query')
  onQueryChange(newVal: WatchVal<this, 'query'>, oldVal: WatchVal<this, 'query'>) {
    console.log('query changed from', oldVal, 'to', newVal)
  }
}
```

Watch multiple properties at once:

```ts
import { WatchVals } from '@verbose/decorators'

@Watch('firstName', 'lastName')
onNameChange(vals: WatchVals<this, 'firstName' | 'lastName'>) {
  // vals is [newFirstName, newLastName]
}
```

### `@When(propName)`

Calls the decorated method exactly once, the first time the named property becomes truthy. Automatically starts on mount and cleans up on unmount.

```ts
@Component()
class Loader extends BaseComponent {
  @State() data: string[] | null = null

  @When('data')
  onFirstData() {
    console.log('data arrived:', this.data)
  }
}
```

### `@History(limit?)`

Adds undo/redo to a `@State` property. Accessible as `{propName}History`. Defaults to 50 entries.

```ts
@Component()
class Editor extends BaseComponent {
  @History(100)
  @State() text = ''

  undo() { this.textHistory.undo() }
  redo() { this.textHistory.redo() }
}
```

The `{prop}History` object exposes: `undo()`, `redo()`, `canUndo`, `canRedo`, `values`, `clear()`.

---

## Lifecycle Hooks

Lifecycle hooks can be used as class methods (via inheritance) or as standalone functions inside `onMount` / other hooks.

### Functional hooks

```ts
import { onMount, onUnmount, onBeforeMount, onAfterUpdate, onError } from '@verbose/decorators'

@Component()
class Timer extends BaseComponent {
  render() {
    onMount(() => {
      const id = setInterval(() => console.log('tick'), 1000)
      onUnmount(() => clearInterval(id))
    })
    return <div />
  }
}
```

| Hook | When it runs |
|------|--------------|
| `onBeforeMount(fn)` | Before first render |
| `onMount(fn)` | After first DOM insertion |
| `onBeforeUpdate(fn)` | Before props update re-render |
| `onAfterUpdate(fn)` | After DOM update |
| `onUnmount(fn)` | When component is removed from DOM |
| `onError(fn)` | When an uncaught error occurs inside the component |

### Class methods (via `BaseComponent`)

Override directly on the class:

```ts
@Component()
class MyComponent extends BaseComponent {
  onMount() {
    console.log('mounted')
  }
  onUnmount() {
    console.log('unmounted')
  }
  render() { return <div /> }
}
```

---

## Events & Slots

### `@Emit(propName)`

Binds the decorated method and calls the named prop callback with its return value. Ensures correct `this` binding.

```ts
@Component()
class Input extends BaseComponent {
  @Prop() onChange?: (value: string) => void
  @State() value = ''

  @Emit('onChange')
  handleInput(e: Event) {
    this.value = (e.target as HTMLInputElement).value
    return this.value  // passed to onChange prop
  }

  render() {
    return <input value={this.props.value} onInput={this.handleInput} />
  }
}
```

### `@OnCommand(propName)`

Subscribes the decorated method to a `Command` prop. Automatically unsubscribes on unmount.

```ts
import { Command, createCommand } from '@verbose/decorators'

@Component()
class Modal extends BaseComponent {
  @Prop() close?: Command

  @OnCommand('close')
  handleClose() {
    console.log('modal closed by command')
  }

  render() { return <div /> }
}

// Usage:
const closeModal = createCommand()
<Modal close={closeModal} />
closeModal.trigger()
```

### `@Slot(name?)`

Declares a named slot. The getter returns the distributed children for that slot. Use without a name for the default slot.

```ts
@Component()
class Layout extends BaseComponent {
  @Slot() default!: Child[]
  @Slot('header') header!: Child[]
  @Slot('footer') footer!: Child[]

  render() {
    return (
      <div>
        <header>{this.header}</header>
        <main>{this.default}</main>
        <footer>{this.footer}</footer>
      </div>
    )
  }
}
```

### `Command<T>` and `createCommand<T>()`

An imperative event bus for triggering component actions from the outside.

```ts
import { createCommand } from '@verbose/decorators'

const reset = createCommand()
reset.trigger()
reset.subscribe(() => console.log('reset!'))
```

---

## Performance Decorators

### `@Memoize(areEqual?)`

Class-level decorator that skips re-renders when the component's resolved props have not changed since the last render **and** no `@State` property was written. Equivalent to `React.memo`.

The optional `areEqual(prev, next)` function receives the previous and next resolved prop values and must return `true` when the component should **not** re-render. Defaults to a shallow (`Object.is`) equality check over all props.

```ts
import { Memoize, Component, Prop, BaseComponent } from '@verbose/decorators'

@Memoize()
@Component()
class Avatar extends BaseComponent {
  @Prop() url = ''
  @Prop() size = 48

  render() {
    return <img src={this.props.url} width={this.props.size} />
  }
}
```

If `url` and `size` haven't changed since the last render, the component skips its render entirely. Internal `@State` changes always trigger a re-render regardless.

**Custom equality — deep comparison for object props:**

```ts
function deepEqual(
  prev: Record<string, unknown>,
  next: Record<string, unknown>,
): boolean {
  return JSON.stringify(prev) === JSON.stringify(next)
}

@Memoize(deepEqual)
@Component()
class Chart extends BaseComponent {
  @Prop() data: DataPoint[] = []

  render() { return <canvas /> }
}
```

With `deepEqual`, passing a new array reference with the same contents does **not** trigger a re-render.

**How it works:**
- The decorator sets `isMemoized = true` and stores `arePropsEqual` on the constructor.
- The renderer resolves any function-valued props (signals passed as props) on each re-render cycle, then compares the resolved values against the previous render's snapshot.
- A `_stateDirty` flag on the instance ensures that `@State` writes always bypass the memoize check.

### `@Lazy(placeholder?)`

Defers rendering the component until it enters the viewport. Shows an empty placeholder element while off-screen.

```ts
@Lazy(300)  // 300px placeholder height
@Component()
class HeavyChart extends BaseComponent {
  render() { return <canvas /> }
}
```

### `@Virtual(itemHeight, buffer?)`

Virtualizes rendering for large lists. Only items in the visible viewport (plus `buffer` items on each side) are rendered.

```ts
@Virtual(48, 5)
@Component()
class UserList extends BaseComponent {
  @Prop() items: User[] = []

  renderItem(item: User, index: number) {
    return <div key={item.id}>{item.name}</div>
  }

  render() { return <div /> }
}
```

The `items` property and `renderItem` method are required.

---

## Timing Decorators

### `@Debounce(ms)`

Delays method execution by `ms`, canceling any previously scheduled call.

```ts
@Debounce(300)
onSearch(query: string) {
  fetch(`/api/search?q=${query}`)
}
```

### `@Throttle(ms)`

Limits execution to at most once every `ms` milliseconds (leading edge).

```ts
@Throttle(1000)
onScroll(e: Event) {
  this.scrollY = window.scrollY
}
```

---

## Utility Decorators

### `@Bind()`

Automatically binds the method to the instance so it can be safely passed as a callback.

```ts
@Bind()
handleClick() {
  console.log(this)  // always the component instance
}

render() {
  return <button onClick={this.handleClick}>Click</button>
}
```

### `@Log(options?)`

Logs method invocations with arguments, return value, and execution time. Dev-only by default.

```ts
@Log({ level: 'debug', time: true })
fetchData(id: number) {
  return fetch(`/api/${id}`)
}
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `level` | `'log' \| 'debug' \| 'warn'` | `'log'` | Console method |
| `args` | `boolean` | `true` | Log arguments |
| `result` | `boolean` | `true` | Log return value |
| `time` | `boolean` | `false` | Log execution time |
| `devOnly` | `boolean` | `true` | Skip in production |

### `@Once()`

Ensures the method runs at most once per instance. The result is cached and returned on subsequent calls.

```ts
@Once()
async loadConfig() {
  const res = await fetch('/config.json')
  return res.json()
}
```

### `@Retry(maxAttempts, options?)`

Automatically retries an async method on failure.

```ts
@Retry(3, { delay: 500, backoff: true })
async saveData(data: object) {
  await api.save(data)
}
```

| Option | Type | Description |
|--------|------|-------------|
| `delay` | `number` | Wait (ms) before first retry |
| `backoff` | `boolean` | Double delay on each retry |
| `onRetry` | `(attempt, error) => void` | Called before each retry |

---

## BaseComponent

Abstract base class that all components extend. Provides the props system and lifecycle method stubs.

```ts
abstract class BaseComponent {
  readonly props: Record<string, any>

  abstract render(): VNode | null

  onBeforeMount?(): void
  onMount?(): void
  onBeforeUpdate?(prevProps: Record<string, any>): void
  onAfterUpdate?(prevProps: Record<string, any>): void
  onUnmount?(): void
  onError?(error: Error): void
}
```
