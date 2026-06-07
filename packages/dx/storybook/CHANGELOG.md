# @praxisjs/storybook

## 0.1.7

### Patch Changes

- Updated dependencies [dc031d0]
  - @praxisjs/runtime@0.4.1
  - @praxisjs/vite-plugin@1.0.3

## 0.1.6

### Patch Changes

- Updated dependencies [80442e0]
  - @praxisjs/runtime@0.4.0
  - @praxisjs/vite-plugin@1.0.2

## 0.1.5

### Patch Changes

- @praxisjs/runtime@0.3.2
- @praxisjs/vite-plugin@1.0.1

## 0.1.4

### Patch Changes

- Updated dependencies [8abc950]
  - @praxisjs/vite-plugin@1.0.0
  - @praxisjs/runtime@0.3.1

## 0.1.3

### Patch Changes

- Updated dependencies [41eb531]
- Updated dependencies [1a0631b]
  - @praxisjs/runtime@0.3.0

## 0.1.2

### Patch Changes

- Updated dependencies [b9411cb]
  - @praxisjs/runtime@0.2.18

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
