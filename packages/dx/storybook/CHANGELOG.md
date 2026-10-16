# @praxisjs/storybook

## 0.3.2

### Patch Changes

- Updated dependencies [d634a29]
  - @praxisjs/runtime@0.8.1
  - @praxisjs/vite-plugin@4.2.1

## 0.3.1

### Patch Changes

- Updated dependencies [3e7f2d8]
  - @praxisjs/vite-plugin@4.2.0

## 0.3.0

### Minor Changes

- 75115a9: Tooling cleanup and fixes.
  - `@praxisjs/ssg`: `prerender()` reuses one JSDOM window for the whole run and resets it before each route (fresh copy of the template, the route's URL, empty storage, no window globals left by the previous route) instead of parsing a new one per route: 300 routes went from about 900 ms to about 170 ms. The window is closed at the end, so timers a page leaves running no longer outlive the build. `localStorage`/`sessionStorage` are now the page's own (they were the host's, so `@Persisted` values leaked between routes). A page is unmounted even when serializing it fails. Pages are written in parallel, and an absolute `build.outDir` is no longer nested under the project root.
  - `@praxisjs/mcp`: `praxisjs_get_page` accepts the `/docs/…` links `praxisjs_overview` lists (they used to 404), full praxisjs.org URLs, trailing slashes and `.md`/`.mdx`. Docs responses are cached in memory for 10 minutes, concurrent requests share one fetch and requests time out after 15 seconds. `praxisjs_get_install_command` checks package names strictly and drops duplicates. The server reports its real version.
  - `@praxisjs/storybook`: re-rendering a story (new args, HMR) now disposes the previous render, which used to keep its effects alive. Each canvas tracks its own story, and `renderToCanvas` returns a teardown for Storybook. The preset registers a new `@praxisjs/storybook/preview` entry with `renderToCanvas` and a default `render` (the meta's `component` mounted with the args), so `.storybook/preview.ts` needs no setup. Preset paths work in folders with spaces and on Windows; story source is read asynchronously, and `.story.*` files get the source panel too.
  - `praxisjs`: `doctor` flags `@praxisjs/*` versions that don't work together (`vite-plugin` 4.1+ or `jsx` 0.8+ with `runtime` older than 0.8, `decorators` 1.8+ with `core` older than 2.3). `upgrade` looks packages up in parallel, honors `npm_config_registry`, never moves a dependency to an older version, detects `bun.lock`, and reports a malformed `package.json` instead of crashing. The AI skills cover `For`/`Index`, `@Selector`, `createTransition()`, compiled templates, the upload composables and the devtools debugging options (`@Debug({ log, break })`, `@Trace({ slow })`, the profiler).
  - `create-praxisjs`: `npm run lint` failed in every freshly scaffolded project, because the type-aware parser options also applied to `eslint.config.mjs`, which no tsconfig includes. They now apply to `.ts`/`.tsx` files only. The blog template renders its post list with `For`.

### Patch Changes

- 75115a9: Published packages no longer contain their tests: package builds compile `src` without `src/**/__tests__` (through a `tsconfig.build.json`), and each package's `files` leaves test sources and stale compiled tests out of the tarball. `pnpm typecheck` still type-checks the tests.
- Updated dependencies [75115a9]
- Updated dependencies [75115a9]
- Updated dependencies [75115a9]
- Updated dependencies [75115a9]
- Updated dependencies [75115a9]
- Updated dependencies [75115a9]
- Updated dependencies [75115a9]
- Updated dependencies [75115a9]
- Updated dependencies [75115a9]
- Updated dependencies [75115a9]
- Updated dependencies [75115a9]
- Updated dependencies [75115a9]
  - @praxisjs/vite-plugin@4.1.0
  - @praxisjs/runtime@0.8.0

## 0.2.11

### Patch Changes

- Updated dependencies [7720b22]
  - @praxisjs/runtime@0.7.1

## 0.2.10

### Patch Changes

- Updated dependencies [073e76a]
  - @praxisjs/runtime@0.7.0
  - @praxisjs/vite-plugin@4.0.6

## 0.2.9

### Patch Changes

- Updated dependencies [728c90e]
  - @praxisjs/runtime@0.6.0
  - @praxisjs/vite-plugin@4.0.5

## 0.2.8

### Patch Changes

- @praxisjs/runtime@0.5.5
- @praxisjs/vite-plugin@4.0.4

## 0.2.7

### Patch Changes

- Updated dependencies [192dfc0]
  - @praxisjs/vite-plugin@4.0.3

## 0.2.6

### Patch Changes

- Updated dependencies [e65617f]
  - @praxisjs/vite-plugin@4.0.2

## 0.2.5

### Patch Changes

- Updated dependencies [22d9a4e]
  - @praxisjs/vite-plugin@4.0.1

## 0.2.4

### Patch Changes

- 9c2a7e0: Removed the `@storybook/core` dependency and peer dependency. It never published a Storybook 9/10 release, so it dragged in a stale `@storybook/theming@8.6.18` (via its own `@storybook/core@8.6.18` sub-dependency) that peer-requires `storybook@^8.x`, conflicting with this repo's `storybook@10.4.0` and pinning `esbuild` below what `vite@8.1.4` requires.

  `src/render.ts` and `src/types.ts` now import `RenderContext`, `WebRenderer`, `ComponentAnnotations`, and `StoryAnnotations` from `storybook/internal/types` and `storybook/internal/csf` instead — the same types, re-exported directly from the `storybook` package since Storybook 9 folded `@storybook/core`'s contents into it. No change to `Meta`, `StoryObj`, or any other public export.

- Updated dependencies [9c2a7e0]
  - @praxisjs/vite-plugin@4.0.0

## 0.2.3

### Patch Changes

- @praxisjs/vite-plugin@3.0.0

## 0.2.2

### Patch Changes

- @praxisjs/vite-plugin@2.0.0

## 0.2.1

### Patch Changes

- f252376: Added the missing `sourceUrl` and `expanded` fields to `StorybookRefs`, matching the options documented for [Storybook Composition](https://storybook.js.org/docs/sharing/storybook-composition) refs.

## 0.2.0

### Minor Changes

- 4d1e55f: Added `refs` to `StorybookConfig` to support [Storybook Composition](https://storybook.js.org/docs/sharing/storybook-composition), and exported the new `StorybookRefs` type.

## 0.1.12

### Patch Changes

- @praxisjs/runtime@0.5.4
- @praxisjs/vite-plugin@1.0.7

## 0.1.11

### Patch Changes

- Updated dependencies [8ab6426]
  - @praxisjs/runtime@0.5.3
  - @praxisjs/vite-plugin@1.0.6

## 0.1.10

### Patch Changes

- @praxisjs/runtime@0.5.2
- @praxisjs/vite-plugin@1.0.5

## 0.1.9

### Patch Changes

- Updated dependencies [98076e7]
  - @praxisjs/runtime@0.5.1

## 0.1.8

### Patch Changes

- Updated dependencies [4060b4f]
  - @praxisjs/runtime@0.5.0
  - @praxisjs/vite-plugin@1.0.4

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
