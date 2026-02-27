---
layout: home

hero:
  name: Verbose
  text: Signal-driven frontend framework
  tagline: Fine-grained reactivity, class components with decorators, and a complete first-party ecosystem — all in TypeScript.
  actions:
    - theme: brand
      text: Get Started
      link: /guide/getting-started
    - theme: alt
      text: Browse Packages
      link: /packages/core

features:
  - icon: ⚡
    title: Fine-grained Reactivity
    details: Built on signals and computed values. Only the parts of the UI that actually changed get updated — no virtual DOM diffing, no wasted renders.
    link: /packages/core
    linkText: Explore Core

  - icon: 🏗️
    title: Class Components with Decorators
    details: Express component logic with TypeScript decorators. @State, @Prop, @Watch, @Emit and more keep your components clean, explicit, and type-safe.
    link: /packages/decorators
    linkText: Explore Decorators

  - icon: 🔀
    title: Built-in Router
    details: First-party client-side router with nested routes, lazy loading, navigation guards, and full TypeScript support out of the box.
    link: /packages/router
    linkText: Explore Router

  - icon: 🗄️
    title: Reactive Store
    details: Predictable state management powered by signals. Define stores with actions and computed state — no boilerplate, no magic strings.
    link: /packages/store
    linkText: Explore Store

  - icon: 🎞️
    title: Motion & Animations
    details: Declarative animation primitives with spring physics, keyframes, and timeline sequencing. Animate anything with signal-driven control.
    link: /packages/motion
    linkText: Explore Motion

  - icon: 🔄
    title: Finite State Machines
    details: Model complex UI flows as explicit state machines. Prevent impossible states and make transitions predictable and testable.
    link: /packages/fsm
    linkText: Explore FSM

  - icon: 💉
    title: Dependency Injection
    details: Lightweight DI container built for components. Scope services to the component tree, swap implementations for testing, and avoid global singletons.
    link: /packages/di
    linkText: Explore DI

  - icon: 🔁
    title: Concurrency Utilities
    details: Async task primitives with cancellation, debouncing, and retry logic. Manage async state without race conditions or manual cleanup.
    link: /packages/concurrent
    linkText: Explore Concurrent

  - icon: 🧩
    title: Composables
    details: Reusable reactive logic as composable functions. Share stateful behavior across components without mixins or higher-order components.
    link: /packages/composables
    linkText: Explore Composables
---
