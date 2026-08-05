---
"praxisjs": patch
"create-praxisjs": patch
---

Refreshed the Claude Code and Codex skill instructions to match the current framework surface. `create-praxisjs` installs the same skills through its "Add an AI integration?" scaffolding step, so newly scaffolded projects receive the corrected content too.

Corrected two things the skills previously got wrong: `StatefulComponent` / `StatelessComponent` / `Composable` are imported from `@praxisjs/core` (not `@praxisjs/runtime`), and `StatelessComponent` takes its props as a generic type parameter read through `this.props` — `@Prop`, `@State`, `@Watch`, `@Emit`, and `@Slot` are `StatefulComponent`-only. The old `import { signal, computed, effect, batch } from '@praxisjs/core'` example was removed: those primitives live in `@praxisjs/core/internal` and are not application API.

Both skills gained a **Check for a native path first** section: before implementing anything uncertain, the assistant must search the docs for an existing PraxisJS decorator, composable, or package export rather than hand-rolling it — including before reaching for a third-party dependency. It ships with a lookup table mapping ~25 commonly hand-written utilities (debounce timers, loading flags around `fetch`, `localStorage` sync, undo stacks, resize/intersection listeners, `requestAnimationFrame` tweens, singleton state objects, retry loops, list virtualization) to the first-party API that already covers them. The same agreement was added to the bundled `CLAUDE.md` / `AGENTS.md` templates.

Both skills now carry a per-package API map (decorators grouped by category, router/store/di/content/css/concurrent exports, tooling entry points), the complete docs slug table including `css/*`, `tooling/ssg`, `tooling/storybook`, `tooling/cli`, `tooling/devtools-plugins`, `ecosystem/ui`, and `guide/*`, the `blog` scaffolding template, `render()` and lifecycle-hook basics, the reference-vs-mutation signal rule, a warning about the `Lazy` name collision between `@praxisjs/decorators` and `@praxisjs/router`, and all four MCP tools including `praxisjs_full_docs`.

Fixed the docs slugs for index pages in the skills' lookup tables — Fumadocs serves those at the bare directory (`css`, `decorators`, `composables`), so the previous `css/index` entry returned a 404 through `praxisjs_get_page`.

The `CLAUDE.md` / `AGENTS.md` templates gained a content/blog variant covering `@praxisjs/content` and `@praxisjs/ssg`, and the project-config reference now describes `Stylesheet` vs. `ReactiveStylesheet` and a store-based i18n pattern.
