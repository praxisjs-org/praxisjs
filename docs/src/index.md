---
layout: home

hero:
  name: Verbose
  text: The TypeScript-first frontend framework
  tagline: Build with signals, decorators, and a complete first-party ecosystem. No virtual DOM. No magic. Just reactive TypeScript done right.
  actions:
    - theme: brand
      text: Get Started
      link: /guide/getting-started
    - theme: alt
      text: Browse Packages
      link: /packages/core
    - theme: alt
      text: GitHub
      link: https://github.com/MateusGX/verbose

features:
  - icon: ⚡
    title: Fine-grained Reactivity
    details: Signals and computed values at the core. Only what actually changed gets updated — no virtual DOM diffing, no unnecessary renders.
    link: /packages/core
    linkText: Explore Core

  - icon: 🏗️
    title: Class Components with Decorators
    details: Write components with TypeScript class syntax. @State, @Prop, @Watch, @Emit and more — expressive, explicit, and fully typed.
    link: /packages/decorators
    linkText: Explore Decorators

  - icon: 🔀
    title: Client-side Router
    details: First-party routing with nested routes, lazy loading, and navigation guards. Full TypeScript support included out of the box.
    link: /packages/router
    linkText: Explore Router

  - icon: 🗄️
    title: Reactive Store
    details: Signal-powered state management with actions and computed values. Define your store, use it anywhere — no boilerplate, no magic strings.
    link: /packages/store
    linkText: Explore Store

  - icon: 🎞️
    title: Motion & Animations
    details: Spring physics, keyframes, and timeline sequencing. Declarative, signal-driven animation for any element in your UI.
    link: /packages/motion
    linkText: Explore Motion

  - icon: 🔄
    title: Finite State Machines
    details: Model complex UI flows as explicit state machines. No impossible states, predictable transitions, and built-in testability.
    link: /packages/fsm
    linkText: Explore FSM

  - icon: 💉
    title: Dependency Injection
    details: Tree-scoped DI container built for components. Swap implementations for testing, isolate services, and avoid global singletons.
    link: /packages/di
    linkText: Explore DI

  - icon: 🔁
    title: Concurrency Utilities
    details: Async tasks with cancellation, debouncing, and retry logic built in. No race conditions, no manual cleanup.
    link: /packages/concurrent
    linkText: Explore Concurrent

  - icon: 🧩
    title: Composables
    details: Package reactive behavior as composable functions. Reuse stateful logic across components without mixins or higher-order components.
    link: /packages/composables
    linkText: Explore Composables

  - icon: 🛠️
    title: Developer Tools
    details: Built-in devtools panel for inspecting signals, component trees, and reactive state — integrated directly into your app during development.
    link: /packages/devtools
    linkText: Explore DevTools

  - icon: ⚛️
    title: JSX Runtime
    details: Custom JSX transform built for Verbose. Full type safety, no React dependency, and seamless integration with the signal-based rendering engine.
    link: /packages/jsx
    linkText: Explore JSX

  - icon: 🔌
    title: Vite Plugin
    details: Zero-config Vite integration with HMR support. Drop it in and get instant feedback on component and signal changes without full page reloads.
    link: /packages/vite-plugin
    linkText: Explore Vite Plugin
---

## The right amount of verbose

The name is intentional. Verbose was designed around the idea that code should be **explicit by default** — not terse to the point of hiding intent, and not ceremonious for the sake of it. The goal is the ideal level of verbosity: enough to make structure visible, patterns enforceable, and onboarding straightforward.

Decorators like `@State`, `@Prop`, and `@Watch` aren't boilerplate — they're declarations. They make the contract of a component readable at a glance, help teams agree on patterns, and give tooling a clear surface to work with.

## A framework that gets out of your way

Built around one idea: reactivity should be **explicit, fine-grained, and TypeScript-native**. Signals propagate changes directly to the DOM nodes that care about them — no reconciliation pass, no diffing overhead.

```tsx
import { Component, State, Prop } from "@verbose/decorators";
import { BaseComponent } from "@verbose/core";

@Component()
class Counter extends BaseComponent {
  @Prop() initialCount = 0;
  @State() count = 0;

  increment() {
    this.count++;
  }

  render() {
    return (
      <div>
        <p>Count: {this.count}</p>
        <button onClick={() => this.increment()}>Increment</button>
      </div>
    );
  }
}
```

::: warning Experimental
Verbose is under active development. APIs are unstable and subject to breaking changes at any time. Not recommended for production use. [See project status →](/project-status)
:::
