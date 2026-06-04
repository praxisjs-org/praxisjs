---
"@praxisjs/fsm": minor
---

Add guards, per-transition actions, and onEnter/onExit context to @StateMachine.

- **Guard functions** — set `guard` on any transition to conditionally block it. `send()` returns `false` and no side effects run (no `onExit`, no history) when the guard fails. `can(event)` also evaluates the guard.
- **Per-transition action** — set `action` on a transition; runs after state is committed and `onTransition` fires, before `onEnter`.
- **Instance access** — pass the component class as the third generic `@StateMachine<S, E, T>`; guards and actions receive the instance as their first argument: `guard: (self) => self.isValid()`.
- **Hook context** — `onEnter` and `onExit` receive an optional `{ event, from }` / `{ event, to }` context. Zero-argument callbacks remain valid.
- **New export** — `TransitionTarget<S, T>` type for the object form of a transition config.
