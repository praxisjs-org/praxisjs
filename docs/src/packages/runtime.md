# @praxisjs/runtime

::: warning Bugs and broken features
This package may have bugs or partially broken functionality. If you run into something, feel free to [open an issue or contribute on GitHub](https://github.com/praxisjs-org/praxisjs).
:::

::: code-group

```sh [npm]
npm install @praxisjs/runtime
```

```sh [pnpm]
pnpm add @praxisjs/runtime
```

```sh [yarn]
yarn add @praxisjs/runtime
```

:::

VNode rendering engine. Turns JSX output into real DOM nodes and keeps them in sync with reactive signals.

## `render(vnode, container)`

Mounts a VNode tree into a DOM container. Handles initial mount and subsequent reactive updates.

```ts
import { render } from '@praxisjs/runtime'

render(<App />, document.getElementById('app')!)
```

Calling `render` again with the same container reconciles the existing tree rather than replacing it.

---

## How it works

### Component lifecycle

When a class component VNode is mounted:

1. Component is instantiated with `props`
2. `initSlots` populates named and default slots from `children`
3. `onBeforeMount` is called
4. `render()` is called — return value is mounted to DOM
5. `onMount` is called

On prop changes:

1. `onBeforeUpdate(prevProps)` is called
2. `render()` is called again — DOM is patched
3. `onAfterUpdate(prevProps)` is called

On unmount:

1. `onUnmount` is called
2. DOM node is removed
3. All reactive effects started during render are stopped

On error (thrown during render or lifecycle hooks):

1. `onError(e)` is called with the caught `Error`

### Reactive rendering

Effects created during `render()` are tracked. When any signal they depend on changes, the component re-renders and the DOM is patched.

### Prop reactivity

Props are applied to DOM elements as reactive effects. Signal values used in props are re-applied automatically when they change, without re-rendering the whole component tree.

---

## Event mapping

JSX event handler props are mapped to native DOM events:

| JSX prop          | DOM event       |
| ----------------- | --------------- |
| `onClick`         | `click`         |
| `onChange`        | `change`        |
| `onInput`         | `input`         |
| `onSubmit`        | `submit`        |
| `onKeyDown`       | `keydown`       |
| `onKeyUp`         | `keyup`         |
| `onFocus`         | `focus`         |
| `onBlur`          | `blur`          |
| `onMouseDown`     | `mousedown`     |
| `onMouseUp`       | `mouseup`       |
| `onMouseMove`     | `mousemove`     |
| `onScroll`        | `scroll`        |
| `onDragStart`     | `dragstart`     |
| `onDragEnd`       | `dragend`       |
| `onDrop`          | `drop`          |
| `onTouchStart`    | `touchstart`    |
| `onTouchEnd`      | `touchend`      |
| `onAnimationEnd`  | `animationend`  |
| `onTransitionEnd` | `transitionend` |
