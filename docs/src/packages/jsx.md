# @verbose/jsx

::: code-group

```sh [npm]
npm install @verbose/jsx
```

```sh [pnpm]
pnpm add @verbose/jsx
```

```sh [yarn]
yarn add @verbose/jsx
```

:::

JSX runtime and TypeScript type definitions. Configure your project to use this package as the JSX import source.

## Configuration

```json
// tsconfig.json
{
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "@verbose/jsx"
  }
}
```

With this configuration, TypeScript automatically imports `jsx` and `jsxs` from `@verbose/jsx/jsx-runtime` — no explicit imports needed in component files.

---

## Runtime Functions

These are used by the TypeScript/Babel JSX transform and generally not called directly.

### `jsx(type, props, key?)`

Creates a virtual node. Called for single-child elements.

```ts
import { jsx } from '@verbose/jsx'

jsx('div', { class: 'box', children: 'Hello' })
```

### `jsxs(type, props, key?)`

Alias for `jsx`, called for elements with multiple children.

### `Fragment`

Symbol for grouping elements without a DOM wrapper.

```tsx
import { Fragment } from '@verbose/jsx'

// JSX shorthand:
<>
  <p>First</p>
  <p>Second</p>
</>

// Desugars to:
jsx(Fragment, { children: [...] })
```

---

## VNode

Every JSX expression produces a `VNode`:

```ts
type VNode = {
  type: string | ComponentConstructor | FunctionComponent | typeof Fragment
  props: Record<string, any>
  children: Child[]
  key?: string
}

type Child = VNode | string | number | boolean | null | undefined
```

---

## Component Types

### `ComponentConstructor<P>`

Type for class components:

```ts
type ComponentConstructor<P = {}> = new (props: P) => ComponentInstance
```

### `FunctionComponent<P>`

Type for function components:

```ts
type FunctionComponent<P = {}> = (props: P) => VNode | null
```

---

## JSX Types

### `JSX.Element`

All JSX expressions resolve to `VNode`.

### `JSX.IntrinsicElements`

Full type coverage for HTML elements. All support:

**Universal attributes:**

| Attribute | Type |
|-----------|------|
| `id` | `string` |
| `class` / `className` | `string` |
| `style` | `string \| Record<string, string>` |
| `key` | `string \| number` |
| `ref` | `{ current: T \| null }` |
| `tabIndex` | `number` |
| `title` | `string` |
| `hidden` | `boolean` |
| `draggable` | `boolean` |

**Accessibility:**

| Attribute | Type |
|-----------|------|
| `role` | `string` |
| `aria-label` | `string` |
| `aria-hidden` | `boolean` |
| `aria-expanded` | `boolean` |
| `aria-checked` | `boolean` |

**Event handlers:**

| Handler | Event |
|---------|-------|
| `onClick` | `MouseEvent` |
| `onInput` | `InputEvent` |
| `onChange` | `Event` |
| `onSubmit` | `SubmitEvent` |
| `onKeyDown` | `KeyboardEvent` |
| `onKeyUp` | `KeyboardEvent` |
| `onFocus` | `FocusEvent` |
| `onBlur` | `FocusEvent` |
| `onMouseDown` | `MouseEvent` |
| `onMouseUp` | `MouseEvent` |
| `onMouseMove` | `MouseEvent` |
| `onScroll` | `Event` |

**Supported HTML elements:**

`div`, `span`, `p`, `h1`–`h6`, `button`, `input`, `form`, `ul`, `ol`, `li`, `a`, `img`, `section`, `header`, `main`, `footer`, `nav`, `article`, `aside`, `label`, `select`, `option`, `textarea`, `table`, `thead`, `tbody`, `tfoot`, `tr`, `th`, `td`, `pre`, `code`, `strong`, `em`, `small`, `hr`, `br`

---

## Examples

```tsx
// Class component
@Component()
class Card extends BaseComponent {
  @Prop() title = ''

  render() {
    return (
      <div class="card">
        <h2>{this.props.title}</h2>
        {this.props.children}
      </div>
    )
  }
}

// Function component
function Badge({ label, color = 'blue' }: { label: string; color?: string }) {
  return <span class={`badge badge-${color}`}>{label}</span>
}

// Usage
<Card title="Hello">
  <Badge label="New" color="green" />
</Card>
```
