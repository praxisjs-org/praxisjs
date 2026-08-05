# praxisjs

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
