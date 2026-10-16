# praxisjs

## 1.2.0

### Minor Changes

- 5a9d6cf: Start projects with Kosmesis and with a ready-to-paste agent prompt.
  - create-praxisjs asks "Add Kosmesis UI components?" (Tailwind CSS or `@praxisjs/css`), or takes `--kosmesis[=tailwind|praxisjs-css]` / `--no-kosmesis`, with every template and with Tauri v2. It runs `kosmesis init` without prompts through the package manager (`kosmesis@^0.6.0`) and adds `button` and `card`; when that fails it keeps the project and prints the commands to run later.
  - New `praxisjs add kosmesis` sets Kosmesis up in an existing project (Tauri included): it detects the project, installs missing dependencies, runs `kosmesis init` (interactive in a terminal without flags, otherwise `--yes` with `--style-system`, `--components` and the `kosmesis init` flags) and prints the next steps.
  - With an AI integration, create-praxisjs ends with a prompt that starts the project setup with the agent (PraxisJS MCP server, skills and docs, the memory bootstrap skill, folder structure and conventions). `praxisjs ai add`, `praxisjs ai sync` when it adds the MCP server, and `praxisjs add kosmesis` with an AI integration end with a prompt that maps the project into its memory. Both prompts are in the Quick Start.
  - The skills no longer map an unmapped project on their own at session start: after `praxisjs_inspect_project`, they ask, with the `.praxisjs-ai.json` questions, whether the project is still the empty scaffold (`praxisjs_memory_init` only) or should be mapped (the `praxisjs-memory-bootstrap` skill), and save the answer as `memory` in `.praxisjs-ai.json`. The new-project setup prompt runs this checklist; the map prompt stays an explicit request to map.

### Patch Changes

- 078aa73: The AI skills list the new Performance docs pages (benchmarks, why PraxisJS is fast, writing fast PraxisJS code), and the performance skill points agents to them.

## 1.1.0

### Minor Changes

- 75115a9: AI integrations know the project, not only the docs.
  - `@praxisjs/mcp`: new tools `praxisjs_search_docs`, `praxisjs_api_reference` (signature of the installed version), `praxisjs_list_apis`, `praxisjs_inspect_project`, `praxisjs_validate_file` (PraxisJS rules: `@Component`, `accessor`, decorator placement and order, `this.props`, in-place state mutation, static reads in `render()`, unknown members, core imports) and `praxisjs_scaffold`, plus a project memory in `.praxis/` (versioned in git, managed only through `praxisjs_memory_init`/`list`/`get`/`search`/`add`/`update`/`remove`/`map`/`check_duplicate`: reusable components and utilities, business rules, architecture decisions, conventions, glossary; validated, secret-free, atomic, diff-friendly). The project root comes from `PRAXISJS_PROJECT_ROOT`, `CLAUDE_PROJECT_DIR`, MCP roots or the working directory. Tools declare MCP annotations. Morphos and Kosmesis: docs lookup (`library`), `praxisjs_ui_components` (registries, installed versions, outdated, local edits), UI libraries in the inspection, Morphos exports in `praxisjs_api_reference`, Kosmesis components and `conventions/ui-libraries` in the mapper. Memory bootstrap (`praxisjs_memory_bootstrap_plan`, `praxisjs_memory_upsert` with dry run and rewrite confirmation), a versioned format with `praxisjs_memory_migrate` (dry run, atomic swap), and feature-slice awareness in the layout, scaffold and validator.
  - `praxisjs`: `ai add` configures the MCP server where the agents read it (`.mcp.json` + `enabledMcpjsonServers` for Claude Code instead of the ignored `.claude/settings.json` key, `.codex/config.toml` for Codex), merging existing configs; `ai remove` removes only what it added; `doctor` checks the server configuration and skills. New `praxisjs ai sync [--dry-run]` updates older installs in place with an install lock (`.praxisjs-ai.lock.json`) and the hashes of earlier releases, never overwriting edited files without confirmation; `doctor` reports an outdated setup and `upgrade` offers to sync it. The skills gain prominent rules (docs through the MCP, no duplication, Extending PraxisJS APIs, no `accessor`, folder structure, memory only through the MCP, validation) and eleven DX skills: component, decorator, composable, store, testing, performance, upgrade, memory, memory bootstrap, UI (Morphos/Kosmesis) and AI-setup migration; the project structure reference adds feature slices as an example layout.

- 75115a9: Tooling cleanup and fixes.
  - `@praxisjs/ssg`: `prerender()` reuses one JSDOM window for the whole run and resets it before each route (fresh copy of the template, the route's URL, empty storage, no window globals left by the previous route) instead of parsing a new one per route: 300 routes went from about 900 ms to about 170 ms. The window is closed at the end, so timers a page leaves running no longer outlive the build. `localStorage`/`sessionStorage` are now the page's own (they were the host's, so `@Persisted` values leaked between routes). A page is unmounted even when serializing it fails. Pages are written in parallel, and an absolute `build.outDir` is no longer nested under the project root.
  - `@praxisjs/mcp`: `praxisjs_get_page` accepts the `/docs/…` links `praxisjs_overview` lists (they used to 404), full praxisjs.org URLs, trailing slashes and `.md`/`.mdx`. Docs responses are cached in memory for 10 minutes, concurrent requests share one fetch and requests time out after 15 seconds. `praxisjs_get_install_command` checks package names strictly and drops duplicates. The server reports its real version.
  - `@praxisjs/storybook`: re-rendering a story (new args, HMR) now disposes the previous render, which used to keep its effects alive. Each canvas tracks its own story, and `renderToCanvas` returns a teardown for Storybook. The preset registers a new `@praxisjs/storybook/preview` entry with `renderToCanvas` and a default `render` (the meta's `component` mounted with the args), so `.storybook/preview.ts` needs no setup. Preset paths work in folders with spaces and on Windows; story source is read asynchronously, and `.story.*` files get the source panel too.
  - `praxisjs`: `doctor` flags `@praxisjs/*` versions that don't work together (`vite-plugin` 4.1+ or `jsx` 0.8+ with `runtime` older than 0.8, `decorators` 1.8+ with `core` older than 2.3). `upgrade` looks packages up in parallel, honors `npm_config_registry`, never moves a dependency to an older version, detects `bun.lock`, and reports a malformed `package.json` instead of crashing. The AI skills cover `For`/`Index`, `@Selector`, `createTransition()`, compiled templates, the upload composables and the devtools debugging options (`@Debug({ log, break })`, `@Trace({ slow })`, the profiler).
  - `create-praxisjs`: `npm run lint` failed in every freshly scaffolded project, because the type-aware parser options also applied to `eslint.config.mjs`, which no tsconfig includes. They now apply to `.ts`/`.tsx` files only. The blog template renders its post list with `For`.

- 75115a9: `praxisjs upgrade` also upgrades the `@morphos/*` packages and the `kosmesis` CLI a project already lists, with the same range rules as `@praxisjs/*`. It reads the peer dependencies of the releases it picks and holds back any upgrade that would break one (held back `@praxisjs/*` packages stay together), lists peer conflicts the project already had, and groups its output by ecosystem. In a Kosmesis project it ends by running the installed `kosmesis outdated` (0.5.0 or later) or printing the command to run.

## 1.0.2

### Patch Changes

- dbd162e: Refreshed the Claude Code and Codex skill instructions to match the current framework surface. `create-praxisjs` installs the same skills through its "Add an AI integration?" scaffolding step, so newly scaffolded projects receive the corrected content too.

  Corrected two things the skills previously got wrong: `StatefulComponent` / `StatelessComponent` / `Composable` are imported from `@praxisjs/core` (not `@praxisjs/runtime`), and `StatelessComponent` takes its props as a generic type parameter read through `this.props` — `@Prop`, `@State`, `@Watch`, `@Emit`, and `@Slot` are `StatefulComponent`-only. The old `import { signal, computed, effect, batch } from '@praxisjs/core'` example was removed: those primitives live in `@praxisjs/core/internal` and are not application API.

  Both skills gained a **Check for a native path first** section: before implementing anything uncertain, the assistant must search the docs for an existing PraxisJS decorator, composable, or package export rather than hand-rolling it — including before reaching for a third-party dependency. It ships with a lookup table mapping ~25 commonly hand-written utilities (debounce timers, loading flags around `fetch`, `localStorage` sync, undo stacks, resize/intersection listeners, `requestAnimationFrame` tweens, singleton state objects, retry loops, list virtualization) to the first-party API that already covers them. The same agreement was added to the bundled `CLAUDE.md` / `AGENTS.md` templates.

  Both skills now carry a per-package API map (decorators grouped by category, router/store/di/content/css/concurrent exports, tooling entry points), the complete docs slug table including `css/*`, `tooling/ssg`, `tooling/storybook`, `tooling/cli`, `tooling/devtools-plugins`, `ecosystem/ui`, and `guide/*`, the `blog` scaffolding template, `render()` and lifecycle-hook basics, the reference-vs-mutation signal rule, a warning about the `Lazy` name collision between `@praxisjs/decorators` and `@praxisjs/router`, and all four MCP tools including `praxisjs_full_docs`.

  Fixed the docs slugs for index pages in the skills' lookup tables — Fumadocs serves those at the bare directory (`css`, `decorators`, `composables`), so the previous `css/index` entry returned a 404 through `praxisjs_get_page`.

  The `CLAUDE.md` / `AGENTS.md` templates gained a content/blog variant covering `@praxisjs/content` and `@praxisjs/ssg`, and the project-config reference now describes `Stylesheet` vs. `ReactiveStylesheet` and a store-based i18n pattern.

## 1.0.1

### Patch Changes

- 9c2a7e0: `praxisjs doctor` now flags `useDefineForClassFields: false` instead of `true`, matching the Vite 8 / oxc requirement (see the `@praxisjs/vite-plugin` changelog). Projects still on the old Vite 7 setup with `false` will need to flip this once they upgrade.

  Bumped the `tsdown` build dependency from `0.20.3` to `0.22.4` — the older version's `typescript` peer range (`^5.0.0`) didn't include this repo's `typescript@6.0.3`, so `pnpm install` reported an unmet peer dependency. No change to the published output.

## 1.0.0

### Major Changes

- 7fc21f8: **Breaking:** the `add` command is renamed to `ai add` — run `praxisjs ai add` instead of `praxisjs add`. This makes room for future `praxisjs ai <subcommand>` commands.

  Three new commands:
  - `praxisjs ai remove` — removes an AI integration: deletes the skill directory and, for Claude Code, `.claude/settings.json`. Leaves `CLAUDE.md`/`AGENTS.md` and `.praxisjs-ai.json` untouched, since those aren't owned exclusively by the integration.
  - `praxisjs doctor` — diagnoses common project issues: missing `@praxisjs/*` dependencies, tsconfig options required by PraxisJS (`jsxImportSource`, `jsx`, `useDefineForClassFields`), and whether an installed AI integration (Claude Code or Codex) is fully initialized — skill files, MCP config/`AGENTS.md`, the memory file (`CLAUDE.md`/`AGENTS.md`), and `.praxisjs-ai.json` all present.
  - `praxisjs upgrade` — updates every `@praxisjs/*` dependency in `package.json` to its latest published version and reinstalls with the detected package manager.

  The Claude Code and Codex skill instructions were also rewritten to match the current framework: the full docs slug list, the renamed router/store APIs (`@Router`/`@Route`, `@Storable`/`@Store`), the `praxisjs_get_install_command` MCP tool for dependency installs, and pointers to `praxisjs doctor` / `praxisjs upgrade` for existing-project maintenance.

## 0.1.0

### Minor Changes

- 38f8205: Initial release — CLI for maintaining existing PraxisJS projects. Ships `praxisjs add`, which installs an AI integration (Claude Code or Codex skill) into an existing project; this command previously lived in `create-praxisjs`.
