# @praxisjs/core

::: warning Bugs and broken features
This package may have bugs or partially broken functionality. If you run into something, feel free to [open an issue or contribute on GitHub](https://github.com/praxisjs-org/praxisjs).
:::

::: code-group

```sh [npm]
npm install @praxisjs/core
```

```sh [pnpm]
pnpm add @praxisjs/core
```

```sh [yarn]
yarn add @praxisjs/core
```

:::

Base classes for PraxisJS class components. Exported from `@praxisjs/core`.

## Reactivity

PraxisJS uses **fine-grained signals** as its reactivity primitive. You don't create signals manually — decorators like `@State()` and `@Prop()` create and wire them automatically for each decorated property.

- `@State()` wraps the property in a writable signal. Reading `this.count` returns the current value; assigning `this.count = 1` updates the signal and triggers any dependent effects.
- `@Prop()` wraps incoming props in signals so changes from the parent propagate reactively to the child.
- `@Computed()` derives a read-only cached value from other signals; it recomputes only when a dependency changes.
- `@Persisted()` works like `@State()` but the signal is backed by `localStorage` and survives page reloads.

### Render runs once

`render()` is called **only once** on mount. To keep a value live in the DOM, pass it as an arrow function:

```tsx
@Component()
class Counter extends StatefulComponent {
  @State() count = 0

  render() {
    return (
      <div>
        <p>{() => this.count}</p>
        <button onClick={() => { this.count++ }}>+</button>
      </div>
    )
  }
}
```

`{() => this.count}` is wrapped in an `effect()` by the renderer and patches only that DOM node when the signal changes. Writing `{this.count}` would capture the value at mount time and never update.

### Derived state with `@Computed()`

```tsx
import { Component, State, Computed } from "@praxisjs/decorators";
import { StatefulComponent } from "@praxisjs/core";

@Component()
class Cart extends StatefulComponent {
  @State() items: { price: number }[] = []

  @Computed()
  get total() {
    return this.items.reduce((sum, p) => sum + p.price, 0)
  }

  render() {
    return <p>Total: {() => this.total}</p>
  }
}
```

## StatefulComponent

Abstract base class for class components that use decorators (`@State`, `@Prop`, etc.). Provides the props system and lifecycle method stubs.

```ts
import { StatefulComponent } from "@praxisjs/core";

abstract class StatefulComponent {
  abstract render(): Node | Node[] | null;

  onBeforeMount?(): void;
  onMount?(): void;
  onUnmount?(): void;
  onError?(error: Error): void;
}
```

### Lifecycle Hooks

Override these methods directly on the class:

```ts
@Component()
class MyComponent extends StatefulComponent {
  onMount() {
    console.log('mounted')
  }
  onUnmount() {
    console.log('unmounted')
  }
  render() { return <div /> }
}
```

| Method            | When it runs                           |
| ----------------- | -------------------------------------- |
| `onBeforeMount()` | Before first render                    |
| `onMount()`       | After first DOM insertion              |
| `onUnmount()`     | When removed from DOM                  |
| `onError(err)`    | On uncaught error inside the component |

## StatelessComponent

Abstract base class for typed, prop-only class components that do not use decorator-based state. Accepts a generic type parameter for strongly-typed props.

```ts
import { StatelessComponent } from "@praxisjs/core";

abstract class StatelessComponent<T extends object = {}> {
  abstract render(): Node | Node[] | null;

  readonly props: T;

  onBeforeMount?(): void;
  onMount?(): void;
  onUnmount?(): void;
  onError?(error: Error): void;
}
```

**Example:**

```ts
import { StatelessComponent } from "@praxisjs/core";
import { Component } from "@praxisjs/decorators";

@Component()
class Badge extends StatelessComponent<{ label: string; color?: string }> {
  render() {
    return (
      <span style={() => `color: ${this.props.color ?? "inherit"}`}>
        {this.props.label}
      </span>
    );
  }
}
```

Use `StatelessComponent` when the component derives everything from its props and has no internal reactive state.

## resource()

Creates a reactive async resource that tracks the state of a promise-based fetch operation. Returns an object with computed signals for `data`, `pending`, `error`, and `status`.

```ts
import { resource } from "@praxisjs/core";

const todos = resource(() => fetch("/api/todos").then((r) => r.json()));

todos.data; // Computed<T | null>
todos.pending; // Computed<boolean>
todos.error; // Computed<unknown>
todos.status; // Computed<"idle" | "pending" | "success" | "error">
```

### Options

```ts
interface ResourceOptions<T> {
  initialData?: T; // Initial value before first fetch (default: null)
  immediate?: boolean; // Run fetcher immediately (default: true)
  keepPreviousData?: boolean; // Keep old data while refetching (default: false)
}
```

### Methods

| Method         | Description                                                 |
| -------------- | ----------------------------------------------------------- |
| `refetch()`    | Re-runs the fetcher                                         |
| `cancel()`     | Cancels any in-flight request and resets status to `"idle"` |
| `mutate(data)` | Optimistically sets data without calling the fetcher        |

### Example

```tsx
@Component()
class UserList extends StatefulComponent {
  users = resource(() => fetch("/api/users").then((r) => r.json()), {
    keepPreviousData: true,
  });

  render() {
    if (this.users.pending()) return <p>Loading...</p>;
    if (this.users.error()) return <p>Error loading users.</p>;
    return (
      <ul>
        {this.users.data()?.map((u) => (
          <li>{u.name}</li>
        ))}
      </ul>
    );
  }
}
```

## createResource()

Like `resource()`, but accepts a reactive signal as its first argument. The fetcher is re-run automatically whenever the signal value changes.

```ts
import { createResource } from "@praxisjs/core";
import { signal } from "@praxisjs/decorators";

const userId = signal(1);
const user = createResource(userId, (id) =>
  fetch(`/api/users/${id}`).then((r) => r.json()),
);
```

When `userId` changes, `user` automatically refetches with the new value.
