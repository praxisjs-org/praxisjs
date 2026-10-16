# @praxisjs/mcp

## 0.4.0

### Minor Changes

- 75115a9: AI integrations know the project, not only the docs.
  - `@praxisjs/mcp`: new tools `praxisjs_search_docs`, `praxisjs_api_reference` (signature of the installed version), `praxisjs_list_apis`, `praxisjs_inspect_project`, `praxisjs_validate_file` (PraxisJS rules: `@Component`, `accessor`, decorator placement and order, `this.props`, in-place state mutation, static reads in `render()`, unknown members, core imports) and `praxisjs_scaffold`, plus a project memory in `.praxis/` (versioned in git, managed only through `praxisjs_memory_init`/`list`/`get`/`search`/`add`/`update`/`remove`/`map`/`check_duplicate`: reusable components and utilities, business rules, architecture decisions, conventions, glossary; validated, secret-free, atomic, diff-friendly). The project root comes from `PRAXISJS_PROJECT_ROOT`, `CLAUDE_PROJECT_DIR`, MCP roots or the working directory. Tools declare MCP annotations. Morphos and Kosmesis: docs lookup (`library`), `praxisjs_ui_components` (registries, installed versions, outdated, local edits), UI libraries in the inspection, Morphos exports in `praxisjs_api_reference`, Kosmesis components and `conventions/ui-libraries` in the mapper. Memory bootstrap (`praxisjs_memory_bootstrap_plan`, `praxisjs_memory_upsert` with dry run and rewrite confirmation), a versioned format with `praxisjs_memory_migrate` (dry run, atomic swap), and feature-slice awareness in the layout, scaffold and validator.
  - `praxisjs`: `ai add` configures the MCP server where the agents read it (`.mcp.json` + `enabledMcpjsonServers` for Claude Code instead of the ignored `.claude/settings.json` key, `.codex/config.toml` for Codex), merging existing configs; `ai remove` removes only what it added; `doctor` checks the server configuration and skills. New `praxisjs ai sync [--dry-run]` updates older installs in place with an install lock (`.praxisjs-ai.lock.json`) and the hashes of earlier releases, never overwriting edited files without confirmation; `doctor` reports an outdated setup and `upgrade` offers to sync it. The skills gain prominent rules (docs through the MCP, no duplication, Extending PraxisJS APIs, no `accessor`, folder structure, memory only through the MCP, validation) and eleven DX skills: component, decorator, composable, store, testing, performance, upgrade, memory, memory bootstrap, UI (Morphos/Kosmesis) and AI-setup migration; the project structure reference adds feature slices as an example layout.

### Patch Changes

- 75115a9: Tooling cleanup and fixes.
  - `@praxisjs/ssg`: `prerender()` reuses one JSDOM window for the whole run and resets it before each route (fresh copy of the template, the route's URL, empty storage, no window globals left by the previous route) instead of parsing a new one per route: 300 routes went from about 900 ms to about 170 ms. The window is closed at the end, so timers a page leaves running no longer outlive the build. `localStorage`/`sessionStorage` are now the page's own (they were the host's, so `@Persisted` values leaked between routes). A page is unmounted even when serializing it fails. Pages are written in parallel, and an absolute `build.outDir` is no longer nested under the project root.
  - `@praxisjs/mcp`: `praxisjs_get_page` accepts the `/docs/…` links `praxisjs_overview` lists (they used to 404), full praxisjs.org URLs, trailing slashes and `.md`/`.mdx`. Docs responses are cached in memory for 10 minutes, concurrent requests share one fetch and requests time out after 15 seconds. `praxisjs_get_install_command` checks package names strictly and drops duplicates. The server reports its real version.
  - `@praxisjs/storybook`: re-rendering a story (new args, HMR) now disposes the previous render, which used to keep its effects alive. Each canvas tracks its own story, and `renderToCanvas` returns a teardown for Storybook. The preset registers a new `@praxisjs/storybook/preview` entry with `renderToCanvas` and a default `render` (the meta's `component` mounted with the args), so `.storybook/preview.ts` needs no setup. Preset paths work in folders with spaces and on Windows; story source is read asynchronously, and `.story.*` files get the source panel too.
  - `praxisjs`: `doctor` flags `@praxisjs/*` versions that don't work together (`vite-plugin` 4.1+ or `jsx` 0.8+ with `runtime` older than 0.8, `decorators` 1.8+ with `core` older than 2.3). `upgrade` looks packages up in parallel, honors `npm_config_registry`, never moves a dependency to an older version, detects `bun.lock`, and reports a malformed `package.json` instead of crashing. The AI skills cover `For`/`Index`, `@Selector`, `createTransition()`, compiled templates, the upload composables and the devtools debugging options (`@Debug({ log, break })`, `@Trace({ slow })`, the profiler).
  - `create-praxisjs`: `npm run lint` failed in every freshly scaffolded project, because the type-aware parser options also applied to `eslint.config.mjs`, which no tsconfig includes. They now apply to `.ts`/`.tsx` files only. The blog template renders its post list with `For`.

## 0.3.1

### Patch Changes

- 9c2a7e0: Bumped the `tsdown` build dependency from `0.20.3` to `0.22.4` — the older version's `typescript` peer range (`^5.0.0`) didn't include this repo's `typescript@6.0.3`, so `pnpm install` reported an unmet peer dependency. No change to the published output or any public API.

## 0.3.0

### Minor Changes

- a0372af: Knowledge base expanded with `@praxisjs/css` documentation.

  The MCP server now surfaces the full `@praxisjs/css` reference — `Stylesheet`, `ReactiveStylesheet`, `@Styled()`, the fluent CSS builder, `@Param()`, `@Style()`, `keyframes()`, `globalStyle()`, `preflight()`, design tokens (`TokenSheet`, `@Themed`, `ThemeInstance`), `cx()`, and the `praxisjsCSS()` Vite plugin — via `praxisjs_get_page`, `praxisjs_full_docs`, and `praxisjs_overview`.

## 0.2.0

### Minor Changes

- 1d79aae: Initial release — MCP server (`praxisjs-mcp`) compatible with any MCP-capable AI assistant (Claude Code, Cursor, VS Code/Copilot, Windsurf). Four tools: `praxisjs_overview` (docs index), `praxisjs_get_page` (page by slug), `praxisjs_full_docs` (full reference), and `praxisjs_get_install_command` (generates correct CLI install commands without version pinning).
