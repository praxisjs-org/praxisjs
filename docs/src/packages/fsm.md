# @verbose/fsm

```sh
npm install @verbose/fsm
```

Finite state machine implementation with reactive state tracking and TypeScript-safe transitions.

## `createMachine<S, E>(definition)`

Creates a state machine from a definition object. State and history are exposed as signals/computed values.

```ts
import { createMachine } from '@verbose/fsm'

type State = 'idle' | 'loading' | 'success' | 'error'
type Event = 'FETCH' | 'RESOLVE' | 'REJECT' | 'RESET'

const machine = createMachine<State, Event>({
  initial: 'idle',
  states: {
    idle: {
      on: { FETCH: 'loading' },
    },
    loading: {
      on: {
        RESOLVE: 'success',
        REJECT: 'error',
      },
      onEnter() {
        console.log('started loading')
      },
      onExit() {
        console.log('loading finished')
      },
    },
    success: {
      on: { RESET: 'idle' },
    },
    error: {
      on: { RESET: 'idle', FETCH: 'loading' },
    },
  },
  onTransition(from, event, to) {
    console.log(`${from} → ${event} → ${to}`)
  },
})
```

## Machine API

### Reading state

```ts
machine.state.value          // 'idle' (Computed)
machine.history.value        // [{ from, event, to, timestamp }, ...]
machine.is('loading')        // true/false
machine.can('FETCH')         // true if 'FETCH' is valid in current state
```

### Sending events

```ts
const transitioned = machine.send('FETCH')  // returns boolean
```

Returns `true` if the transition succeeded, `false` if the event is not valid in the current state.

### Reset

```ts
machine.reset()  // returns to initial state, clears history
```

## Machine Definition

```ts
type MachineDefinition<S extends string, E extends string> = {
  initial: S
  states: StateMap<S, E>
  onTransition?: (from: S, event: E, to: S) => void
}

type StateMap<S extends string, E extends string> = {
  [state in S]: {
    on?: Partial<Record<E, S>>
    onEnter?: () => void
    onExit?: () => void
  }
}
```

`onEnter` and `onExit` are called synchronously during the transition.

## Integration with components

```ts
@Component()
class FetchButton extends BaseComponent {
  machine = createMachine<State, Event>({ /* ... */ })

  async fetch() {
    this.machine.send('FETCH')
    try {
      const data = await api.getData()
      this.machine.send('RESOLVE')
    } catch {
      this.machine.send('REJECT')
    }
  }

  render() {
    return (
      <button
        disabled={this.machine.is('loading')}
        onClick={() => this.fetch()}
      >
        {this.machine.state.value === 'loading' ? 'Loading…' : 'Fetch'}
      </button>
    )
  }
}
```

## `@StateMachine` and `@Transition` Decorators

Declarative FSM integration for class components.

```ts
import { StateMachine, Transition } from '@verbose/fsm'

@StateMachine({ initial: 'idle', states: { /* ... */ } })
@Component()
class VideoPlayer extends BaseComponent {
  @Transition('PLAY')
  play() { /* called when PLAY transition succeeds */ }

  @Transition('PAUSE')
  pause() { /* called when PAUSE transition succeeds */ }
}
```
