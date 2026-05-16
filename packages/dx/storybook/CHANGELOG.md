# @praxisjs/storybook

## 0.1.1

### Patch Changes

- Updated dependencies [9aeec6a]
  - @praxisjs/runtime@0.2.17

## 0.1.0

### Minor Changes

- 4d3b9a4: Introduce `@praxisjs/storybook` — a Storybook framework adapter for PraxisJS.

  Provides everything needed to run PraxisJS components inside Storybook:
  - **`renderToCanvas`** — mounts and unmounts PraxisJS components into the Storybook canvas, with proper cleanup on `forceRemount`.
  - **`viteFinal` preset** — wires up `@praxisjs/vite-plugin` (with HMR) and injects a `storySource` plugin that embeds the original story file source for display in the Storybook UI.
  - **`managerEntries`** — registers the custom manager panel.
  - **`core`** — declares `@storybook/builder-vite` as the builder.
  - **Type helpers** — exports `PraxisRenderer`, `Meta`, `StoryObj`, and `StorybookConfig` for typing stories.

  ESM-only; requires Storybook ≥ 8 and `@storybook/builder-vite`.

### Patch Changes

- Updated dependencies [bb4d00a]
  - @praxisjs/runtime@0.2.16
