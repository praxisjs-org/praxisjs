# @praxisjs/ssg

## 0.1.4

### Patch Changes

- Updated dependencies [d634a29]
  - @praxisjs/runtime@0.8.1
  - @praxisjs/router@2.3.1

## 0.1.3

### Patch Changes

- 75115a9: Tooling cleanup and fixes.
  - `@praxisjs/ssg`: `prerender()` reuses one JSDOM window for the whole run and resets it before each route (fresh copy of the template, the route's URL, empty storage, no window globals left by the previous route) instead of parsing a new one per route: 300 routes went from about 900 ms to about 170 ms. The window is closed at the end, so timers a page leaves running no longer outlive the build. `localStorage`/`sessionStorage` are now the page's own (they were the host's, so `@Persisted` values leaked between routes). A page is unmounted even when serializing it fails. Pages are written in parallel, and an absolute `build.outDir` is no longer nested under the project root.
  - `@praxisjs/mcp`: `praxisjs_get_page` accepts the `/docs/…` links `praxisjs_overview` lists (they used to 404), full praxisjs.org URLs, trailing slashes and `.md`/`.mdx`. Docs responses are cached in memory for 10 minutes, concurrent requests share one fetch and requests time out after 15 seconds. `praxisjs_get_install_command` checks package names strictly and drops duplicates. The server reports its real version.
  - `@praxisjs/storybook`: re-rendering a story (new args, HMR) now disposes the previous render, which used to keep its effects alive. Each canvas tracks its own story, and `renderToCanvas` returns a teardown for Storybook. The preset registers a new `@praxisjs/storybook/preview` entry with `renderToCanvas` and a default `render` (the meta's `component` mounted with the args), so `.storybook/preview.ts` needs no setup. Preset paths work in folders with spaces and on Windows; story source is read asynchronously, and `.story.*` files get the source panel too.
  - `praxisjs`: `doctor` flags `@praxisjs/*` versions that don't work together (`vite-plugin` 4.1+ or `jsx` 0.8+ with `runtime` older than 0.8, `decorators` 1.8+ with `core` older than 2.3). `upgrade` looks packages up in parallel, honors `npm_config_registry`, never moves a dependency to an older version, detects `bun.lock`, and reports a malformed `package.json` instead of crashing. The AI skills cover `For`/`Index`, `@Selector`, `createTransition()`, compiled templates, the upload composables and the devtools debugging options (`@Debug({ log, break })`, `@Trace({ slow })`, the profiler).
  - `create-praxisjs`: `npm run lint` failed in every freshly scaffolded project, because the type-aware parser options also applied to `eslint.config.mjs`, which no tsconfig includes. They now apply to `.ts`/`.tsx` files only. The blog template renders its post list with `For`.

- 75115a9: Published packages no longer contain their tests: package builds compile `src` without `src/**/__tests__` (through a `tsconfig.build.json`), and each package's `files` leaves test sources and stale compiled tests out of the tarball. `pnpm typecheck` still type-checks the tests.
- 75115a9: Smaller startup: `render()` hydrates only after the new `enableHydration()` (called by `ssgPlugin()`), so apps that don't prerender leave the hydration code out. **Breaking:** an app that hydrates server-rendered HTML without `ssgPlugin()` must call `enableHydration()` before `render()`. Also, compiled templates whose tree the HTML parser reads back unchanged are emitted as markup and parsed once (`_$html`); decorated fields, methods and classes call shorter lowering helpers; the list view's internal members are `#private`.
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
- Updated dependencies [75115a9]
- Updated dependencies [75115a9]
- Updated dependencies [75115a9]
  - @praxisjs/router@2.3.0
  - @praxisjs/runtime@0.8.0
  - @praxisjs/core@2.3.0
  - @praxisjs/head@0.3.2
  - @praxisjs/shared@0.3.2

## 0.1.2

### Patch Changes

- Updated dependencies [7720b22]
  - @praxisjs/runtime@0.7.1
  - @praxisjs/router@2.2.2

## 0.1.1

### Patch Changes

- Updated dependencies [a97a37c]
- Updated dependencies [98f3a18]
- Updated dependencies [7f68df1]
- Updated dependencies [073e76a]
  - @praxisjs/core@2.2.0
  - @praxisjs/head@0.3.1
  - @praxisjs/router@2.2.1
  - @praxisjs/runtime@0.7.0

## 0.1.0

### Minor Changes

- dab1c4f: Add `@praxisjs/ssg` — static site generation for PraxisJS.

  `ssgPlugin({ root, routerOptions?, hydrate? })` plugs into `vite.config.ts` alongside `praxisjs()`. `root` exports the app's root component (default export) and route table (named `routes`). A dynamic route like `/blog/:slug` expands into concrete paths via its own `getStaticPaths: (fullPath) => Promise<string[]>` declared directly on the route object — colocated, no path matching needed, and the route's own full path is passed in for helpers like `@praxisjs/content`'s `collectionStaticPaths()` — with a top-level `getStaticPaths` named export on `root` available as a fallback for routes that don't declare their own. After `vite build`, it prerenders every route into its own `index.html`, waiting for `resource()`/`@Collection` data — and any `Lazy(...)`-wrapped route/layout component — to settle before serializing. The lower-level `prerender()` function does the same work without the Vite integration, for custom build pipelines.

  By default the output is marked for client-side hydration (`@praxisjs/runtime`'s `render()` reconciles the real DOM instead of discarding it); pass `hydrate: false` to fall back to a plain client remount instead.

### Patch Changes

- Updated dependencies [1ec5b2f]
- Updated dependencies [ef46e56]
- Updated dependencies [9ceee18]
- Updated dependencies [728c90e]
  - @praxisjs/core@2.1.0
  - @praxisjs/head@0.3.0
  - @praxisjs/router@2.2.0
  - @praxisjs/runtime@0.6.0
