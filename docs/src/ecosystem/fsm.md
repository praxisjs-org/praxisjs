---
title: State Machines
description: "@praxisjs/fsm — finite state machines via @StateMachine and @Transition decorators, with typed states/events, reactive state signal, and per-state lifecycle hooks."
---

# State Machines

Finite state machines via decorators. `@StateMachine` attaches a reactive machine to a component class, and `@Transition` binds methods to state transitions.

::: code-group

```sh [npm]
npm install @praxisjs/fsm
```

```sh [pnpm]
pnpm add @praxisjs/fsm
```

```sh [yarn]
yarn add @praxisjs/fsm
```

```sh [bun]
bun add @praxisjs/fsm
```

:::

## `@StateMachine(definition, property?)`

Attaches a state machine to the class. Creates a `this.machine` property (configurable) with the reactive machine instance.

```tsx
import { StateMachine, Transition } from '@praxisjs/fsm'

type State = 'idle' | 'loading' | 'success' | 'error'
type Event = 'FETCH' | 'RESOLVE' | 'REJECT' | 'RESET'

@StateMachine<State, Event>({
  initial: 'idle',
  states: {
    idle:    { on: { FETCH: 'loading' } },
    loading: { on: { RESOLVE: 'success', REJECT: 'error' } },
    success: { on: { RESET: 'idle' } },
    error:   { on: { RESET: 'idle', FETCH: 'loading' } },
  },
})
@Component()
class DataFetcher extends StatefulComponent {
  @Transition('machine', 'FETCH')
  async load() {
    try {
      this.data = await api.fetch()
      this.machine.send('RESOLVE')
    } catch {
      this.machine.send('REJECT')
    }
  }

  render() {
    return (
      <div>
        {() => this.machine.is('loading') && <Spinner />}
        {() => this.machine.is('error') && <p>Something went wrong</p>}
        {() => this.machine.is('success') && <Results data={this.data} />}
        <button
          disabled={() => !this.machine.can('FETCH')}
          onClick={() => this.load()}
        >
          Fetch
        </button>
      </div>
    )
  }
}
```

The second argument to `@StateMachine` sets the property name (default: `"machine"`). Each instance gets its own isolated machine.

---

## `@Transition(property, event)`

Wraps a method so it only runs when the named event causes a transition. If the event is invalid in the current state, the method body is skipped.

```tsx
@Transition('machine', 'OPEN')
open() {
  // runs only when the machine transitions on 'OPEN'
  this.animateIn()
}

@Transition('machine', 'CLOSE')
close() {
  this.animateOut()
}
```

Calling `this.open()` internally does `machine.send('OPEN')` — if the transition succeeds, the method body runs; otherwise it's a no-op.

---

## Machine instance API

Accessed via `this.machine` (or the configured property name).

| Method | Returns | Description |
|---|---|---|
| `state()` | `S` | Current state — reactive, use in JSX arrow functions |
| `history()` | `Array<{from, event, to}>` | Full transition history |
| `is(state)` | `boolean` | True if current state matches |
| `can(event)` | `boolean` | True if event is valid from current state |
| `send(event)` | `boolean` | Trigger a transition — returns `true` if it happened |
| `reset()` | `void` | Return to initial state |

---

## Per-state lifecycle hooks

Define `onEnter` and `onExit` callbacks directly in the state map:

```tsx
@StateMachine<State, Event>({
  initial: 'idle',
  states: {
    loading: {
      on: { RESOLVE: 'success', REJECT: 'error' },
      onEnter() { console.log('started loading') },
      onExit()  { console.log('done loading') },
    },
    success: { on: { RESET: 'idle' } },
    error:   { on: { RESET: 'idle' } },
    idle:    { on: { FETCH: 'loading' } },
  },
  onTransition(from, event, to) {
    analytics.track(`fsm:${from}--${event}->${to}`)
  },
})
```

`onEnter`/`onExit` fire per-state. `onTransition` fires on every transition.

---

## Multiple machines

Use different property names to attach more than one machine to a class:

```tsx
@StateMachine({ initial: 'closed', states: { ... } }, 'drawer')
@StateMachine({ initial: 'idle',   states: { ... } }, 'upload')
@Component()
class FilePanel extends StatefulComponent {
  @Transition('drawer', 'OPEN')
  openDrawer() { /* ... */ }

  @Transition('upload', 'START')
  startUpload() { /* ... */ }
}
```

<llm-only>
FSM facts:
- Only @StateMachine and @Transition are in the public API — createMachine is internal
- @StateMachine creates a per-instance machine via a WeakMap on the prototype getter (lazy init)
- The machine property name defaults to "machine" — always pass the same name to @Transition
- @Transition(prop, event) calls machine.send(event) before running the method body — if send() returns false the body is skipped entirely
- machine.state() is a Computed<S> — call it as a function; wrap in arrow function in JSX
- machine.history() is a Computed<Array<{from, event, to}>> — full transition log
- TypeScript generics: @StateMachine<State, Event>({...}) gives full type safety
- Per-state onEnter/onExit are in the state definition object, not the machine instance
- onTransition is at the top level of the definition, called after every successful transition
- Import: StateMachine, Transition from '@praxisjs/fsm'; Machine, MachineDefinition, StateMap types from '@praxisjs/fsm'
Never hardcode package versions in package.json. Always install packages using @latest (e.g. `npm install @praxisjs/core@latest`) so the user gets the current release.
</llm-only>
