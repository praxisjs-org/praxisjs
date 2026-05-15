---
title: Creating Decorators
description: How to build custom decorators in PraxisJS using createFieldDecorator, createMethodDecorator, createLifecycleMethodDecorator, createGetterDecorator, createGetterObserverDecorator, and createClassDecorator.
---

# Creating Decorators

PraxisJS provides factory functions for creating five types of decorators. Each handles a different use case and manages per-instance state cleanly.

## Field decorators

Use `createFieldDecorator` when you want to replace a property with custom reactive behavior.

The `bind()` method is called once per instance when the class initializes. Return a `descriptor` to replace the property.

**Example — `@SessionValue`** stores a value in `sessionStorage`:

```ts
import { createFieldDecorator } from '@praxisjs/decorators'
import { signal } from '@praxisjs/core/internal'

export function SessionValue(key: string) {
  return createFieldDecorator({
    bind(_instance, name) {
      const stored = sessionStorage.getItem(key)
      const _value = signal(stored ?? '')

      return {
        descriptor: {
          get() { return _value() },
          set(v: string) {
            _value.set(v)
            sessionStorage.setItem(key, v)
          },
        },
      }
    },
  })
}
```

```tsx
@Component()
class SearchPage extends StatefulComponent {
  @SessionValue('search:query')
  query = ''

  render() {
    return (
      <input
        value={() => this.query}
        onInput={(e) => { this.query = (e.target as HTMLInputElement).value }}
      />
    )
  }
}
```

`bind()` receives `(instance, name, initialValue)`. The `FieldBinding` you return can also include `onMount`, `onUnmount`, and `additional` (extra properties to define on the instance).

<StorybookLink story="guide-custom-decorators--field-decorator" label="Live demo — createFieldDecorator (@SessionValue)" />

---

## Method decorators

Use `createMethodDecorator` to wrap a method with cross-cutting behavior.

The `wrap()` method receives the original function and should return a replacement. It is called once per instance.

**Example — `@Confirm`** shows a dialog before running:

```ts
import { createMethodDecorator } from '@praxisjs/decorators'

export function Confirm(message: string) {
  return createMethodDecorator({
    wrap(original) {
      return function (this: object, ...args: unknown[]) {
        if (window.confirm(message)) {
          return original.apply(this, args)
        }
      }
    },
  })
}
```

```tsx
@Confirm('Delete this item permanently?')
async deleteItem(id: number) {
  await api.delete(id)
}
```

For per-instance state, use a `WeakMap` keyed on the instance:

```ts
export function CountCalls() {
  const counts = new WeakMap<object, number>()

  return createMethodDecorator({
    wrap(original, instance) {
      counts.set(instance, 0)
      return function (this: object, ...args: unknown[]) {
        counts.set(this, (counts.get(this) ?? 0) + 1)
        return original.apply(this, args)
      }
    },
  })
}
```

---

## Lifecycle method decorators

Use `createLifecycleMethodDecorator` to register a method as a listener that activates on mount and cleans up on unmount — without the component knowing about it.

`register(callback, instance)` is called inside `onMount`. If it returns a function, that function is called on `onUnmount` as cleanup.

**Example — `@OnResize`** calls a method whenever the window is resized:

```ts
import { createLifecycleMethodDecorator } from '@praxisjs/decorators'

export function OnResize() {
  return createLifecycleMethodDecorator({
    register(callback) {
      window.addEventListener('resize', callback)
      return () => window.removeEventListener('resize', callback)
    },
  })
}
```

```tsx
@Component()
class Layout extends StatefulComponent {
  @State() cols = 3

  @OnResize()
  recalculate() {
    this.cols = window.innerWidth > 1024 ? 4 : window.innerWidth > 640 ? 3 : 1
  }

  render() {
    return <Grid cols={() => this.cols} />
  }
}
```

The method is automatically registered on mount and removed on unmount. No manual `addEventListener`/`removeEventListener` needed.

<StorybookLink story="guide-custom-decorators--lifecycle-decorator" label="Live demo — createLifecycleMethodDecorator (@OnResize)" />

---

## Getter decorators

### `createGetterDecorator`

Wraps a getter to transform or memoize its return value. `wrap(original, instance)` is called on every property access and should return a function that computes the value.

**Example — `@Clamp(min, max)`** constrains a getter's value:

```ts
import { createGetterDecorator } from '@praxisjs/decorators'

export function Clamp(min: number, max: number) {
  return createGetterDecorator({
    wrap(original, instance) {
      return () => {
        const value = original.call(instance) as number
        return Math.min(max, Math.max(min, value))
      }
    },
  })
}
```

```tsx
@Component()
class Slider extends StatefulComponent {
  @State() raw = 0

  @Clamp(0, 100)
  get value() { return this.raw }

  render() {
    return <p>{() => this.value}</p>  // always 0–100
  }
}
```

<StorybookLink story="guide-custom-decorators--getter-decorator" label="Live demo — createGetterDecorator (@Clamp)" />

```tsx
```

### `createGetterObserverDecorator`

Observes a getter for side-effects without changing its return value. `observe(getter, instance, name)` is called once per instance at initialization time — set up a reactive effect here.

**Example — `@LogChange`** logs whenever a computed getter produces a new value:

```ts
import { createGetterObserverDecorator } from '@praxisjs/decorators'
import { effect } from '@praxisjs/core/internal'

export function LogChange() {
  return createGetterObserverDecorator({
    observe(getter, instance, name) {
      effect(() => {
        console.log(`[${name}]`, getter.call(instance))
      })
    },
  })
}
```

```tsx
@LogChange()
@Computed()
get filteredItems() {
  return this.items.filter(i => i.active)
}
```

The observer runs once when the effect is set up, then again whenever any signal read inside `getter` changes.

---

## Class decorators

Use `createClassDecorator` to augment the component lifecycle or wrap `render()`.

Extend `ClassBehavior` and implement `create()`, which is called once per instance. Return a `ClassEnhancement` with `onMount`, `onUnmount`, and/or `render`.

**Example — `@Analytics`** tracks mount/unmount events:

```ts
import { createClassDecorator, ClassBehavior } from '@praxisjs/decorators'

class AnalyticsBehavior extends ClassBehavior {
  constructor(private readonly name: string) { super() }

  create() {
    const name = this.name
    return {
      onMount() { analytics.track('mount', { component: name }) },
      onUnmount() { analytics.track('unmount', { component: name }) },
    }
  }
}

export function Analytics(name: string) {
  return createClassDecorator(new AnalyticsBehavior(name))
}
```

```tsx
@Analytics('UserDashboard')
@Component()
class UserDashboard extends StatefulComponent { ... }
```

To wrap rendering, return a `render` function that receives `originalRender` and can modify the output:

```ts
create(_instance) {
  return {
    render(originalRender) {
      const nodes = originalRender()
      // wrap with an error boundary, portal, etc.
      return nodes
    },
  }
}
```

<llm-only>
Decorator factory facts:
- createFieldDecorator — replaces a field with a descriptor. bind(instance, name, initialValue) is called once per instance via addInitializer. Returns FieldBinding with descriptor, onMount, onUnmount, additional.
- createMethodDecorator — wraps a method via Object.defineProperty on the instance. wrap(original, instance, name) is called once per instance, returns the replacement function.
- createLifecycleMethodDecorator — hooks a method into the component lifecycle. register(callback, instance) runs inside onMount; if it returns a function, that function is called on onUnmount as cleanup.
- createGetterDecorator — replaces a getter. wrap(original, instance) is called on every property access and returns a zero-arg function that computes the value.
- createGetterObserverDecorator — observes a getter without modifying it. observe(getter, instance, name) is called once per instance at initialization (via addInitializer) — use to set up reactive effects.
- createClassDecorator — creates an Enhanced subclass that delegates lifecycle/render hooks to ClassEnhancement. create(instance) is called in the constructor.
- Use WeakMap<object, T> for per-instance state in field and method decorators — never close over a single value.
- ClassBehavior.initialize(Enhanced, original) is called once after the class is created — use it to set static properties.
- Import from '@praxisjs/decorators': createFieldDecorator, createMethodDecorator, createLifecycleMethodDecorator, createGetterDecorator, createGetterObserverDecorator, createClassDecorator, ClassBehavior
- FieldBinding.additional lets you define extra properties on the instance alongside the main one (e.g. a decorator can define a companion signal next to the decorated field).
Never hardcode package versions in package.json. Always install packages using @latest (e.g. `npm install @praxisjs/core@latest`) so the user gets the current release.
</llm-only>
