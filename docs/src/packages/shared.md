# @verbose/shared

Internal type definitions and utilities shared across all Verbose packages. You generally don't install this directly — it is a peer dependency pulled in by the other packages.

## Signal Types

### `Signal<T>`

A readable and writable reactive value.

```ts
import type { Signal } from '@verbose/shared'
```

| Member | Signature | Description |
|--------|-----------|-------------|
| `()` | `() => T` | Read the current value |
| `set` | `(value: T) => void` | Replace the value |
| `update` | `(updater: (prev: T) => T) => void` | Derive next value from previous |
| `subscribe` | `(effect: (value: T) => void) => () => void` | Subscribe to changes, returns unsubscribe |

### `Computed<T>`

A read-only reactive value derived from other signals.

```ts
import type { Computed } from '@verbose/shared'
```

| Member | Signature | Description |
|--------|-----------|-------------|
| `()` | `() => T` | Read the current value |
| `subscribe` | `(effect: (value: T) => void) => () => void` | Subscribe to changes, returns unsubscribe |

---

## VNode & Children Types

### `VNode`

The internal representation of a rendered element, produced by the JSX transform.

```ts
interface VNode {
  type: string | ComponentConstructor | FunctionComponent
  props: Record<string, unknown>
  children: Children[]
  key?: string | number
}
```

### `Children`

Any value that can appear as a child in a VNode tree.

```ts
type Children = Primitive | VNode | ReactiveChildren | Children[]

type Primitive = string | number | boolean | bigint | symbol | null | undefined

type ReactiveChildren = () => Primitive | VNode | VNode[] | ReactiveChildren[]
```

---

## Component Types

### `FunctionComponent<P>`

Type for function-based components.

```ts
type FunctionComponent<P = Record<string, unknown>> =
  (props: P & { children?: Children[] }) => VNode | null
```

### `ComponentConstructor<P>`

Type for class-based component constructors.

```ts
interface ComponentConstructor<P = Record<string, unknown>> {
  new (props: P): ComponentInstance
  isComponent: true
}
```

### `ComponentInstance`

Interface that all component instances conform to internally.

```ts
interface ComponentInstance {
  render(): VNode | null
  onBeforeMount?(): void
  onMount?(): void
  onUnmount?(): void
  onError?(e: Error): void
}
```

---

## Runtime Utilities

### `isSignal(source)`

Returns `true` if `source` is a writable `Signal` (has a `.set` method).

```ts
import { isSignal } from '@verbose/shared'

isSignal(signal(0))    // true
isSignal(computed(() => 0))  // false
```

### `isComputed(source)`

Returns `true` if `source` is a `Computed` or `Signal` (callable with a `.subscribe` method).

```ts
import { isComputed } from '@verbose/shared'

isComputed(computed(() => 0))  // true
isComputed(signal(0))          // true
isComputed(42)                 // false
```

### `flattenChildren(children)`

Recursively flattens a nested `Children` array into a flat list.

```ts
import { flattenChildren } from '@verbose/shared'

flattenChildren([[<a />, <b />], <c />])
// [<a />, <b />, <c />]
```
