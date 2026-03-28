---
title: Watchers
description: React to state changes with @Watch and @When — declarative side-effect handlers for reactive properties.
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

<llm-only>
@Watch details:
- Runs after the component is mounted; initial value does NOT trigger a call
- When watching a single property: (newVal, oldVal) => void
- When watching multiple: (vals: { propA: T, propB: U }) => void — only current values, no old values for multi-watch
- Set up and torn down automatically by the component lifecycle

@When details:
- Only fires once — subsequent changes do not trigger it again
- The method fires when the signal transitions from falsy to truthy
- Automatically cleaned up after firing or on unmount
</llm-only>
