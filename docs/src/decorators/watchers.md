---
title: Watchers
description: React to state changes with @Watch, @When, and @Until — declarative side-effect handlers and async waiters for reactive properties.
---

# Watchers

## `@Watch(...propNames)`

Calls the decorated method whenever the watched property changes. Receives the new and old values.

```tsx
import { Component, State, Watch } from '@praxisjs/decorators'
import { WatchVal } from '@praxisjs/decorators'

@Component()
class Search extends StatefulComponent {
  @State() query = ''

  @Watch('query')
  onQueryChange(newVal: WatchVal<this, 'query'>, oldVal: WatchVal<this, 'query'>) {
    console.log(`query: ${oldVal} → ${newVal}`)
    this.fetchResults(newVal)
  }

  async fetchResults(q: string) { /* ... */ }

  render() {
    return <input value={() => this.query}
      onInput={(e) => { this.query = (e.target as HTMLInputElement).value }} />
  }
}
```

### Watch multiple properties

When watching multiple props, the method receives an object with all current values:

```tsx
import { WatchVals } from '@praxisjs/decorators'

@Component()
class Form extends StatefulComponent {
  @State() firstName = ''
  @State() lastName = ''

  @Watch('firstName', 'lastName')
  onNameChange(vals: WatchVals<this, 'firstName' | 'lastName'>) {
    console.log(`${vals.firstName} ${vals.lastName}`)
  }
}
```

::: tip Coalesced updates
When multiple watched props change in the same synchronous block, the callback fires **once** with the final values — not once per changed prop. Changes made to signals inside the callback are also automatically batched.

```tsx
// Both change in the same tick → onNameChange fires once with { firstName: 'Jane', lastName: 'Smith' }
this.firstName = 'Jane'
this.lastName = 'Smith'
```
:::

---

## `@When(propName)`

Calls the decorated method **exactly once**, the first time the named property becomes truthy. Automatically set up on mount and cleaned up on unmount.

```tsx
@Component()
class DataLoader extends StatefulComponent {
  @State() data: string[] | null = null

  @When('data')
  onFirstLoad() {
    console.log('Data arrived for the first time:', this.data)
  }

  render() {
    return () => this.data
      ? <ul>{() => this.data!.map(d => <li>{d}</li>)}</ul>
      : <p>Loading...</p>
  }
}
```

Use `@When` for one-time initialization that depends on a value arriving (e.g., first API response, user authentication).

---

## `@Until(propName)`

Replaces the decorated method with one that returns a `Promise` resolving to the first truthy value of the named property. Each call to the method returns a fresh promise.

```tsx
import { Component, State, Until } from '@praxisjs/decorators'

@Component()
class UserProfile extends StatefulComponent {
  @State() user: User | null = null

  @Until('user')
  waitForUser(): Promise<User> { return Promise.resolve(null!) }

  async loadProfile() {
    const user = await this.waitForUser()
    console.log('User ready:', user.name)
  }

  render() { /* ... */ }
}
```

The original method body is ignored — the decorator replaces it entirely. If the property is already truthy when the method is called, the promise resolves on the next microtask.

Use `@Until` when downstream code needs to await a reactive value rather than react to it via a side effect.

<llm-only>
@Watch details:
- Runs after the component is mounted; initial value does NOT trigger a call
- When watching a single property: (newVal, oldVal) => void — fires synchronously after the signal changes
- When watching multiple: (vals: { propA: T, propB: U }) => void — coalesced via queueMicrotask; fires once per microtask boundary even if multiple props change in the same synchronous block; only current values provided, no old values for multi-watch
- Signal writes inside any @Watch callback are automatically batched (wrapped in batch())
- Set up and torn down automatically by the component lifecycle

@When details:
- Only fires once — subsequent changes do not trigger it again
- The method fires when the signal transitions from falsy to truthy
- Automatically cleaned up after firing or on unmount

@Until details:
- Replaces the decorated method body entirely; the original implementation is ignored
- Returns a new Promise on every call — each promise independently waits for the first truthy value
- Resolves with the NonNullable<T> truthy value of the signal/computed
- If the property is already truthy, the promise resolves immediately (microtask)
- Works with both Signal and Computed properties
- No automatic lifecycle cleanup — the promise resolves once and discards the watcher
Never hardcode package versions in package.json. Always install packages using @latest (e.g. `npm install @praxisjs/core@latest`) so the user gets the current release.
</llm-only>
