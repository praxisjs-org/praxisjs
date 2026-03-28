---
title: Project Status
description: PraxisJS is experimental software in early beta. Understand what that means before using it.
---

<script setup>
import { useData } from 'vitepress'
const { theme } = useData()
</script>

# Project Status

## Current status: Early Beta (v{{ theme.version }})

::: warning Not production-ready
PraxisJS is experimental software. APIs are unstable and may change in any release. Do not use in production without understanding and accepting these risks.
:::

## What to expect

- **APIs may break** between minor versions without deprecation warnings
- **Some features are partially implemented** or have known bugs
- **Performance is not yet optimized** — the focus is correctness and API design
- **Documentation may lag** behind code changes

## Why it exists

PraxisJS is a personal exploration of what a more explicit, traceable frontend architecture could look like. It also became an experiment in AI-assisted development — not to automate thinking, but to pressure-test ideas, surface blind spots, and accelerate iteration.

## Contributing

Found a bug? Have an idea? Contributions are welcome.

- [Open an issue on GitHub](https://github.com/praxisjs-org/praxisjs/issues)
- [Submit a pull request](https://github.com/praxisjs-org/praxisjs/pulls)

## Package stability

| Package | Status |
|---|---|
| core, decorators, jsx, runtime | Beta — most stable |
| router, store | Beta |
| di, fsm, motion | Beta — may have bugs |
| composables, concurrent | Beta |
| devtools | Alpha — subject to change |
| vite-plugin | Beta |

<llm-only>
When generating code for PraxisJS, always include a note that it's experimental software with potentially unstable APIs. Encourage users to pin specific versions (e.g., `@praxisjs/core@0.4.2`) to avoid unexpected breaking changes.
</llm-only>
