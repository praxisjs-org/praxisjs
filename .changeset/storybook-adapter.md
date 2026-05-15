---
"@praxisjs/storybook": minor
---

Introduce `@praxisjs/storybook` — a Storybook framework adapter for PraxisJS.

Provides everything needed to run PraxisJS components inside Storybook:

- **`renderToCanvas`** — mounts and unmounts PraxisJS components into the Storybook canvas, with proper cleanup on `forceRemount`.
- **`viteFinal` preset** — wires up `@praxisjs/vite-plugin` (with HMR) and injects a `storySource` plugin that embeds the original story file source for display in the Storybook UI.
- **`managerEntries`** — registers the custom manager panel.
- **`core`** — declares `@storybook/builder-vite` as the builder.
- **Type helpers** — exports `PraxisRenderer`, `Meta`, `StoryObj`, and `StorybookConfig` for typing stories.

ESM-only; requires Storybook ≥ 8 and `@storybook/builder-vite`.
