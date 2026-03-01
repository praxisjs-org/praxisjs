# @praxisjs/jsx

::: warning Bugs and broken features
This package may have bugs or partially broken functionality. If you run into something, feel free to [open an issue or contribute on GitHub](https://github.com/praxisjs-org/praxisjs).
:::

::: code-group

```sh [npm]
npm install @praxisjs/jsx
```

```sh [pnpm]
pnpm add @praxisjs/jsx
```

```sh [yarn]
yarn add @praxisjs/jsx
```

:::

JSX runtime and TypeScript type definitions. Configure your project to use this package as the JSX import source.

## Configuration

```json
// tsconfig.json
{
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "@praxisjs/jsx"
  }
}
```

With this configuration, TypeScript automatically imports `jsx` and `jsxs` from `@praxisjs/jsx/jsx-runtime` — no explicit imports needed in component files.

---

## Runtime Functions

These are used by the TypeScript/Babel JSX transform and generally not called directly.

### `jsx(type, props, key?)`

Creates a virtual node. Called for single-child elements.

```ts
import { jsx } from "@praxisjs/jsx";

jsx("div", { class: "box", children: "Hello" });
```

### `jsxs(type, props, key?)`

Alias for `jsx`, called for elements with multiple children.

### `Fragment`

Symbol for grouping elements without a DOM wrapper.

```tsx
import { Fragment } from '@praxisjs/jsx'

// JSX shorthand:
<>
  <p>First</p>
  <p>Second</p>
</>

// Desugars to:
jsx(Fragment, { children: [...] })
```

---

> **VNode, Children, FunctionComponent, ComponentConstructor** — these types are defined in [@praxisjs/shared](./shared) and re-used by the JSX runtime.

---

## JSX Types

### `JSX.Element`

All JSX expressions resolve to `VNode`.

### `JSX.IntrinsicElements`

Full type coverage for HTML elements. All support:

**Universal attributes:**

| Attribute             | Type                               |
| --------------------- | ---------------------------------- |
| `id`                  | `string`                           |
| `class` / `className` | `string`                           |
| `style`               | `string \| Record<string, string>` |
| `key`                 | `string \| number`                 |
| `ref`                 | `{ current: T \| null }`           |
| `tabIndex`            | `number`                           |
| `title`               | `string`                           |
| `hidden`              | `boolean`                          |
| `draggable`           | `boolean`                          |

**Accessibility:**

| Attribute       | Type      |
| --------------- | --------- |
| `role`          | `string`  |
| `aria-label`    | `string`  |
| `aria-hidden`   | `boolean` |
| `aria-expanded` | `boolean` |
| `aria-checked`  | `boolean` |

**Event handlers:**

| Handler       | Event           |
| ------------- | --------------- |
| `onClick`     | `MouseEvent`    |
| `onInput`     | `InputEvent`    |
| `onChange`    | `Event`         |
| `onSubmit`    | `SubmitEvent`   |
| `onKeyDown`   | `KeyboardEvent` |
| `onKeyUp`     | `KeyboardEvent` |
| `onFocus`     | `FocusEvent`    |
| `onBlur`      | `FocusEvent`    |
| `onMouseDown` | `MouseEvent`    |
| `onMouseUp`   | `MouseEvent`    |
| `onMouseMove` | `MouseEvent`    |
| `onScroll`    | `Event`         |

**Supported HTML elements:**

`div`, `span`, `p`, `h1`–`h6`, `button`, `input`, `form`, `ul`, `ol`, `li`, `a`, `img`, `section`, `header`, `main`, `footer`, `nav`, `article`, `aside`, `label`, `select`, `option`, `textarea`, `table`, `thead`, `tbody`, `tfoot`, `tr`, `th`, `td`, `pre`, `code`, `strong`, `em`, `small`, `hr`, `br`

---

## Examples

```tsx
// Class component
@Component()
class Card extends BaseComponent {
  @Prop() title = "";
  @Slot() default?: Children;

  render() {
    return (
      <div class="card">
        <h2>{this.title}</h2>
        {this.default}
      </div>
    );
  }
}

// Function component
function Badge({ label, color = "blue" }: { label: string; color?: string }) {
  return <span class={`badge badge-${color}`}>{label}</span>;
}

// Usage
<Card title="Hello">
  <Badge label="New" color="green" />
</Card>;
```
