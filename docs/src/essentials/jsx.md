---
title: JSX Syntax
description: PraxisJS uses a custom JSX runtime. Learn how to write reactive templates, handle events, use fragments, and map lists.
---

# JSX Syntax

PraxisJS uses a custom JSX runtime (`@praxisjs/jsx`). Files with JSX must use the `.tsx` extension.

## Reactive vs static expressions

The key rule: **arrow functions are reactive, plain expressions are static**.

```tsx
render() {
  return (
    <div>
      {() => this.name}           {/* reactive — updates on change */}
      {this.name}                  {/* static — read once at render */}
      {() => this.count * 2}      {/* reactive expression */}
      {() => this.active ? 'on' : 'off'}  {/* reactive conditional */}
    </div>
  )
}
```

## Conditional rendering

```tsx
render() {
  return (
    <div>
      {/* Reactive conditional — re-evaluates when isOpen changes */}
      {() => this.isOpen && <Modal />}

      {/* Ternary */}
      {() => this.loading ? <Spinner /> : <Content />}
    </div>
  )
}
```

## Lists

```tsx
render() {
  return (
    <ul>
      {() => this.items.map((item) => (
        <li key={item.id}>{item.name}</li>
      ))}
    </ul>
  )
}
```

Always provide a `key` prop when mapping lists. Keys must be stable and unique.

## Event handlers

Event props use camelCase names (`onClick`, `onInput`, `onKeyDown`, etc.):

```tsx
render() {
  return (
    <div>
      <button onClick={() => this.count++}>Increment</button>
      <input onInput={(e) => { this.value = (e.target as HTMLInputElement).value }} />
    </div>
  )
}
```

Event handlers are plain arrow functions — they don't need to be reactive because they're callbacks, not DOM expressions.

## CSS classes

Static class:
```tsx
<div class="card elevated">...</div>
```

Reactive class:
```tsx
<div class={() => this.active ? 'card active' : 'card'}>...</div>
```

## Inline styles

```tsx
<div style={{ color: 'red', fontSize: '16px' }}>...</div>

{/* Reactive */}
<div style={() => ({ opacity: this.visible ? 1 : 0 })}>...</div>
```

## Fragments

Group elements without a wrapper node:

```tsx
render() {
  return (
    <>
      <Header />
      <Main />
      <Footer />
    </>
  )
}
```

## ref

Pass a callback to `ref` to capture a DOM element. The callback receives the element once it is mounted:

```tsx
@Component()
class InputFocus extends StatefulComponent {
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
JSX rendering rules:
- Arrow functions () => expr are wrapped in reactive effects that patch only the DOM node when dependencies change
- Plain expressions are evaluated once and never re-evaluated
- key prop is required for list items to enable efficient reconciliation
- ref prop accepts a callback (el: T) => void — the element is passed in after mount
- Event handlers: onClick, onInput, onChange, onKeyDown, onKeyUp, onFocus, onBlur, onSubmit, etc.
- class prop (not className) for CSS classes
- style accepts an object or reactive function returning an object
Never hardcode package versions in package.json. Always install packages using @latest (e.g. `npm install @praxisjs/core@latest`) so the user gets the current release.
</llm-only>
