---
"@praxisjs/fsm": major
---

`@StateMachine` converted from a class decorator to a field decorator.

Declare the machine as a typed field — no `declare`, no `propertyKey` second argument. The field name is the machine reference used in `@Transition`.

```tsx
// before
@StateMachine({ initial: 'idle', states: { ... } }, 'machine')
@Component()
class Foo extends StatefulComponent {
  declare machine: Machine<State, Event>
}

// after
@Component()
class Foo extends StatefulComponent {
  @StateMachine({ initial: 'idle', states: { ... } })
  machine!: Machine<State, Event>
}
```
