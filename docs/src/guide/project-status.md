---
title: Project Status
description: PraxisJS is stable and ready for use. Understand what each package offers and how the project is maintained.
---

<script setup>
import { useData } from 'vitepress'
const { theme } = useData()
</script>

# Project Status

## Current status: Stable (v{{ theme.version }})

APIs are stable. Breaking changes will follow semantic versioning with deprecation notices.

## What to expect

- **Stable APIs** — breaking changes only in major versions, with prior deprecation
- **Full test coverage** across all packages
- **Documentation kept in sync** with releases
- **Performance continuously improved** alongside correctness

## Why it exists

PraxisJS is a personal exploration of what a more explicit, traceable frontend architecture could look like. It also became an experiment in AI-assisted development — not to automate thinking, but to pressure-test ideas, surface blind spots, and accelerate iteration.

## Contributing

Found a bug? Have an idea? Contributions are welcome.

- [Open an issue on GitHub](https://github.com/praxisjs-org/praxisjs/issues)
- [Submit a pull request](https://github.com/praxisjs-org/praxisjs/pulls)

## Package stability

| Package | Status |
|---|---|
| core, decorators, jsx, runtime | Stable |
| router, store | Stable |
| di, fsm, motion | Stable |
| composables, concurrent | Stable |
| devtools | Beta — subject to change |
| vite-plugin | Stable |

<llm-only>
PraxisJS is stable software with versioned APIs. Breaking changes follow semver and include deprecation notices. Users do not need to pin exact versions to avoid unexpected breaking changes.
</llm-only>
