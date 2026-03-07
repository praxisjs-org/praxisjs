# @praxisjs/decorators

::: warning Bugs and broken features
This package may have bugs or partially broken functionality. If you run into something, feel free to [open an issue or contribute on GitHub](https://github.com/praxisjs-org/praxisjs).
:::

::: code-group

```sh [npm]
npm install @praxisjs/decorators
```

```sh [pnpm]
pnpm add @praxisjs/decorators
```

```sh [yarn]
yarn add @praxisjs/decorators
```

:::

TypeScript decorators for defining components, reactive state, lifecycle hooks, and utilities.

## Component Decorator

### `@Component()`

Marks a class as a PraxisJS component.

```ts
import { Component, Slot } from '@praxisjs/decorators'
import { StatefulComponent } from '@praxisjs/core'
import type { Children } from '@praxisjs/shared'

@Component()
class MyButton extends StatefulComponent {
  @Slot() default?: Children

  render() {
    return <button>{this.default}</button>
  }
}
```

---

## Props & State

### `@Prop()`

Declares an external prop. The value comes from the parent; the decorated property acts as the default.

```ts
@Component()
class Card extends StatefulComponent {
  @Prop() title = 'Untitled'
  @Prop() elevated = false

  render() {
    return <div class={() => this.elevated ? 'elevated' : ''}>{() => this.title}</div>
  }
}
```

### `@State()`

Declares a reactive signal property. The getter returns the current value; the setter updates the underlying signal.

```ts
@Component()
class Toggle extends StatefulComponent {
  @State() open = false

  render() {
    return (
      <button onClick={() => { this.open = !this.open }}>
        {() => this.open ? 'Close' : 'Open'}
      </button>
    )
  }
}
```

::: tip Why arrow functions in templates?
PraxisJS uses fine-grained reactivity — `render()` is called **once** on mount. To keep a value reactive in the DOM, pass it as a function: `{() => this.open}`. The renderer wraps that function in its own `effect()` and updates only that node when the signal changes.

`{this.open}` evaluates immediately to the current value (e.g. `false`) and is never updated again.
:::

### `@Persisted(key?, options?)`

Declares a reactive property backed by `localStorage`. Works like `@State()` but the value survives page reloads. The `key` defaults to the property name when omitted.

```ts
import { Component, Persisted } from '@praxisjs/decorators'
import { StatefulComponent } from '@praxisjs/core'

@Component()
class Settings extends StatefulComponent {
  @Persisted() theme = 'light'
  @Persisted('app:count') count = 0

  render() {
    return (
      <div>
        <p>Theme: {() => this.theme}</p>
        <button onClick={() => { this.theme = this.theme === 'light' ? 'dark' : 'light' }}>
          Toggle theme
        </button>
      </div>
    )
  }
}
```

Setting the property to `null` or `undefined` removes the entry from `localStorage`.

| Option        | Type                   | Default          | Description                                            |
| ------------- | ---------------------- | ---------------- | ------------------------------------------------------ |
| `serialize`   | `(value: T) => string` | `JSON.stringify` | Custom serialization                                   |
| `deserialize` | `(value: string) => T` | `JSON.parse`     | Custom deserialization                                 |
| `syncTabs`    | `boolean`              | `true`           | Sync value across browser tabs via the `storage` event |

**Custom serialization example:**

```ts
@Persisted('user:flags', {
  serialize: (v) => v.join(','),
  deserialize: (s) => s.split(','),
})
flags: string[] = []
```

::: warning Arrays and objects
`@State()` only detects changes when the **reference changes**. Mutating an array or object in-place (e.g. `push`, `splice`, property assignment) will not trigger reactivity.

Always replace the value with a new reference:

```ts
// ✅ reactive — new array reference
this.items = [...this.items, newItem]

// ❌ not reactive — mutates in-place
this.items.push(newItem)
```

The same applies to objects:

```ts
// ✅ reactive
this.config = { ...this.config, theme: 'dark' }

// ❌ not reactive
this.config.theme = 'dark'
```
:::

### `@Computed()`

Declares a read-only reactive getter backed by a cached `computed()` signal. The value is recomputed automatically whenever a `@State` or `@Prop` it reads changes. Use it instead of plain getters when the derived value is expensive or used in reactive templates.

```ts
import { Component, State, Computed } from "@praxisjs/decorators";
import { StatefulComponent } from "@praxisjs/core";

@Component()
class Cart extends StatefulComponent {
  @State() items: { name: string; price: number }[] = []

  @Computed()
  get total() {
    return this.items.reduce((sum, p) => sum + p.price, 0)
  }

  render() {
    return (
      <div>
        <ul>{() => this.items.map((p) => <li>{p.name}</li>)}</ul>
        <p>Total: {() => this.total}</p>
      </div>
    )
  }
}
```

::: tip
A plain getter (`get total() { ... }`) recalculates every time it is read. `@Computed()` caches the result and only recomputes when a signal dependency changes.
:::

---

## Watching State

### `@Watch(...propNames)`

Observes one or more `@State`, `@Prop`, or `@Computed` properties. The decorated method is called with the new and old values whenever they change.

```ts
import { Watch, WatchVal } from "@praxisjs/decorators";

@Component()
class Search extends StatefulComponent {
  @State() query = "";

  @Watch("query")
  onQueryChange(
    newVal: WatchVal<this, "query">,
    oldVal: WatchVal<this, "query">,
  ) {
    console.log("query changed from", oldVal, "to", newVal);
  }
}
```

Watch multiple properties at once:

```ts
import { WatchVals } from '@praxisjs/decorators'

@Watch('firstName', 'lastName')
onNameChange(vals: WatchVals<this, 'firstName' | 'lastName'>) {
  // vals is { firstName: newFirstName, lastName: newLastName }
}
```

### `@When(propName)`

Calls the decorated method exactly once, the first time the named property becomes truthy. Automatically starts on mount and cleans up on unmount.

```ts
@Component()
class Loader extends StatefulComponent {
  @State() data: string[] | null = null;

  @When("data")
  onFirstData() {
    console.log("data arrived:", this.data);
  }
}
```

### `@History(limit?)`

Adds undo/redo to a `@State` property. Accessible as `{propName}History`. Defaults to 50 entries.

```ts
@Component()
class Editor extends StatefulComponent {
  @History(100)
  @State()
  text = "";

  undo() {
    this.textHistory.undo();
  }
  redo() {
    this.textHistory.redo();
  }
}
interface Editor extends WithHistory<Editor, "text"> {}
```

Since TypeScript cannot infer properties added by decorators at runtime, use `WithHistory<Class, 'prop'>` to declare the generated `{prop}History` type — either via interface merging or a `declare` field inside the class:

```ts
// Option 1: interface merging (outside the class)
interface Editor extends WithHistory<Editor, "text"> {}

// Option 2: declare field (inside the class)
@Component()
class Editor extends StatefulComponent {
  @History(100)
  @State()
  text = "";

  declare textHistory: WithHistory<Editor, "text">["textHistory"];
}
```

The `{prop}History` object exposes: `undo()`, `redo()`, `canUndo`, `canRedo`, `values`, `clear()`.

---

## Events & Slots

### `@Emit(propName)`

Binds the decorated method and calls the named prop callback with its return value. Ensures correct `this` binding.

```ts
@Component()
class Input extends StatefulComponent {
  @Prop() onChange?: (value: string) => void
  @State() value = ''

  @Emit('onChange')
  handleInput(e: Event) {
    this.value = (e.target as HTMLInputElement).value
    return this.value  // passed to onChange prop
  }

  render() {
    return <input value={() => this.value} onInput={this.handleInput} />
  }
}
```

**JSX typing:** If you don't declare the callback with `@Prop()`, TypeScript won't include it in the component's JSX props. Add a `declare` field alongside the `@Emit` method to expose it:

```ts
@Component()
class Panel extends StatefulComponent {
  @Emit('onClose')
  handleClose() {}
  declare onClose: (() => void) | undefined  // exposes `onClose` in JSX props
}
```

The `declare` field generates no runtime code — it's a type-only annotation that `InstancePropsOf` picks up to make `<Panel onClose={...} />` valid.

### `@OnCommand(propName)`

Subscribes the decorated method to a `Command` prop. Automatically unsubscribes on unmount.

```ts
import { Command, createCommand } from '@praxisjs/decorators'

@Component()
class Modal extends StatefulComponent {
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

::: info
`@Slot() default` captures all children that were not assigned to a named slot — equivalent to `children` in other frameworks.
:::

```ts
@Component()
class Layout extends StatefulComponent {
  @Slot() default!: Children
  @Slot('header') header!: Children
  @Slot('footer') footer!: Children

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
import { createCommand } from "@praxisjs/decorators";

const reset = createCommand();
reset.trigger();
reset.subscribe(() => console.log("reset!"));
```

---

## Performance Decorators

### `@Lazy(placeholder?)`

Defers rendering the component until it enters the viewport. Shows an empty placeholder element while off-screen.

```ts
@Lazy(300)  // 300px placeholder height
@Component()
class HeavyChart extends StatefulComponent {
  render() { return <canvas /> }
}
```

### `@Virtual(itemHeight, buffer?)`

Virtualizes rendering for large lists. Only items in the visible viewport (plus `buffer` items on each side) are rendered.

```ts
@Virtual(48, 5)
@Component()
class UserList extends StatefulComponent {
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

| Option    | Type                         | Default | Description        |
| --------- | ---------------------------- | ------- | ------------------ |
| `level`   | `'log' \| 'debug' \| 'warn'` | `'log'` | Console method     |
| `args`    | `boolean`                    | `true`  | Log arguments      |
| `result`  | `boolean`                    | `true`  | Log return value   |
| `time`    | `boolean`                    | `false` | Log execution time |
| `devOnly` | `boolean`                    | `true`  | Skip in production |

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

| Option    | Type                       | Description                  |
| --------- | -------------------------- | ---------------------------- |
| `delay`   | `number`                   | Wait (ms) before first retry |
| `backoff` | `boolean`                  | Double delay on each retry   |
| `onRetry` | `(attempt, error) => void` | Called before each retry     |
