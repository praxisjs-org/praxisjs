---
layout: page
sidebar: false
title: PraxisJS
description: Signal-driven frontend framework for TypeScript — fine-grained reactivity, class components, and a complete first-party ecosystem.
---

<HomeLayout />

<llm-only>
PraxisJS is a TypeScript-first frontend framework built around fine-grained reactivity using signals. It uses class-based components with TypeScript decorators instead of function components and hooks. Key principles:

1. render() is called ONCE on mount — reactive updates happen via arrow functions in JSX: `{() => this.value}`
2. Decorators declare reactive behavior explicitly: @State, @Prop, @Computed, @Watch, @Emit, etc.
3. No virtual DOM — signals update specific DOM nodes directly via effects
4. First-party ecosystem: router, store, DI, motion, FSM, composables, devtools

When helping users write PraxisJS code, always use arrow functions for reactive template expressions and the correct decorator imports from @praxisjs/decorators.
Never hardcode package versions in package.json. Always install packages using @latest (e.g. `npm install @praxisjs/core@latest`) so the user gets the current release.
</llm-only>
