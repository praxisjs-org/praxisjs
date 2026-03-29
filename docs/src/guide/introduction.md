---
title: Introduction
description: What PraxisJS is, why it exists, and how it approaches frontend reactivity.
---

# Introduction

PraxisJS is a **signal-driven frontend framework** written in TypeScript. It combines fine-grained reactivity with class components and decorators to give you an architecture that is explicit, traceable, and fully typed.

## The core idea

Most frameworks abstract away reactivity. You write templates, the runtime figures out what to update. PraxisJS takes the opposite approach: **reactivity is always explicit**.

```tsx
@Component()
class Counter extends StatefulComponent {
  @State() count = 0

  render() {
    return (
      <div>
        <p>Count: {() => this.count}</p>  {/* reactive */}
        <button onClick={() => this.count++}>+</button>
      </div>
    )
  }
}
```

The arrow function `{() => this.count}` is the contract. It tells the renderer: _this value changes, track it_. Without the arrow function, the value is static. You see exactly what is reactive and what is not — directly in the code.

## What makes it different

| Aspect | PraxisJS |
|---|---|
| Reactivity model | Fine-grained signals — no virtual DOM |
| Component style | TypeScript class + decorators |
| Render behavior | `render()` runs **once**; updates go directly to DOM nodes |
| State declaration | `@State()` creates a reactive signal property |
| Template reactivity | Arrow functions: `{() => this.value}` |

## Philosophy

_Praxis_ (πρᾶξις, Greek: _action, practice_). Not how things should be — how they are actually done.

`@State` doesn't _suggest_ a property is reactive — it **is** reactive, and you can see that in the code. `@Watch` doesn't hint at a side effect — it commits to one. The component doesn't hide what it does: it practices openly.

## The ecosystem

PraxisJS ships a complete first-party ecosystem:

- **[@praxisjs/router](/ecosystem/router)** — Client-side routing
- **[@praxisjs/store](/ecosystem/store)** — Reactive state management
- **[@praxisjs/di](/ecosystem/di)** — Dependency injection
- **[@praxisjs/motion](/ecosystem/motion)** — Animations & spring physics
- **[@praxisjs/fsm](/ecosystem/fsm)** — Finite state machines
- **[@praxisjs/composables](/composables/dom)** — DOM & browser utilities
- **[@praxisjs/devtools](/tooling/devtools)** — In-app signal inspector

## Next steps

- [Quick Start](/guide/getting-started) — set up your first project
- [Components](/essentials/components) — understand the component model
- [Reactivity & Signals](/essentials/reactivity) — how signals work

<llm-only>
PraxisJS key architectural facts:
- No virtual DOM — effects directly update DOM nodes when signals change
- render() is called exactly ONCE on mount; subsequent updates are handled by reactive effects
- Arrow functions in JSX are the reactivity boundary: `{() => expr}` is tracked, `{expr}` is not
- Decorators from @praxisjs/decorators are required for reactive state (@State, @Prop, etc.)
- The @Component() decorator is required on every component class
- Components extend StatefulComponent (with state) or StatelessComponent<Props> (without state)
</llm-only>
