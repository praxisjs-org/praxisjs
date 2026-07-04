---
name: praxisjs
description: PraxisJS development skill for Claude Code. Invoke whenever working on a PraxisJS project — creating components, managing state, setting up routing, using decorators, fetching async data, or debugging reactivity. Trigger on any mention of @praxisjs/ packages, @State, @Component, StatefulComponent, StatelessComponent, @Resource, @Watch, @Emit, or when the user wants to build reactive UI with TypeScript. This skill enforces three non-negotiable practices: consult praxisjs.org docs before writing code, keep CLAUDE.md updated so every future session has full project context, and follow PraxisJS conventions exactly — no workarounds.
---

# PraxisJS Development

PraxisJS is a signal-driven TypeScript frontend framework. APIs evolve — **never guess at decorator options, argument shapes, or import paths**. Always confirm against the live documentation before writing code.

## The three rules (never skip)

1. **Docs first** — call `praxisjs_overview`, then `praxisjs_get_page` for the relevant topic, before writing any PraxisJS code.
2. **CLAUDE.md always** — read it at the start of every session; update it whenever you make a decision that future sessions need to know.
3. **No workarounds** — if the idiomatic path isn't clear, fetch the docs page. Hacks break as the framework evolves.

---

## Session start checklist (run every time)

Before doing any work, run through this in order:

1. **Check for `.praxisjs-ai.json`** at the project root.
   - If it **doesn't exist**: run the [init flow](#project-config-praxisjs-aijson) before anything else — do not skip it and do not ask questions inline during the task.
   - If it **exists**: read it silently and let it govern all decisions for this session.
2. **Read `CLAUDE.md`** — understand the current project state.
3. **Fetch docs** for the task at hand.

---

## Project config (`.praxisjs-ai.json`)

This file captures developer preferences once so Claude never has to ask the same questions session after session. It is the single source of truth for how code should be generated in this project.

Read `references/project-config.md` for the full config format, option descriptions, and how each setting affects code generation.

### Init flow

Run this when `.praxisjs-ai.json` is absent. Ask the questions below **all at once in a single message** — do not scatter them across multiple turns.

```
I need to set up your PraxisJS project preferences so I don't have to ask
these questions every session. Please answer all of them:

1. Should I write tests for every new component and behavior? (yes / no)
2. What language should identifiers and code comments be in? (e.g. en, pt, es)
3. What language should user-facing UI strings be in? (e.g. en, pt-BR, es)
4. Should I set up i18n (internationalization) support? (yes / no)
5. Which CSS approach does this project use?
   a) Plain CSS / global stylesheet
   b) CSS Modules
   c) Tailwind CSS
   d) UnoCSS
   e) No styles from Claude (I handle CSS myself)
```

After the developer answers, write `.praxisjs-ai.json` immediately, confirm the saved config in one short message, and proceed with the original task.

### Reading the config

At the start of every session after init:
- `tests: true` → write a test file alongside every new component; tests live in `src/__tests__/`
- `codeLocale` → use this locale for identifiers, comments, and variable names
- `uiLocale` → use this locale for all user-facing strings in templates
- `i18n: true` → use the i18n integration pattern from `references/project-config.md`
- `css` → follow the CSS approach when adding styles to components

---

## CLAUDE.md — persistent project memory

Without CLAUDE.md, every new Claude session starts completely blind about the project. With it, sessions are immediately productive.

**If CLAUDE.md doesn't exist: create it before writing any code.**

Use `references/claude-md.md` for the full template. Minimum required sections:

```markdown
# [Project name]

## Stack
- PraxisJS [version] + packages: @praxisjs/[list]
- Build: Vite [version] + @praxisjs/vite-plugin
- Routing: [@praxisjs/router / none]
- State: [@praxisjs/store / none]

## Architecture
[2–4 sentences: what the app does, how it's organized, main entry points]

## Conventions
[Project-specific patterns — e.g. "all forms extend FormBase", "stores are singletons injected via @UseStore"]

## Known constraints
[Anything that would surprise a developer — auth, browser targets, env vars, etc.]
```

**Update CLAUDE.md whenever you:**
- Add or remove a `@praxisjs/*` package
- Establish a new architectural pattern (base class, shared composable, store shape)
- Make a decision that affects how future code should be written
- Change how routing, DI, or the store is configured

CLAUDE.md is a living document, not a log. Remove stale entries when conventions change. Keep it under one page — precision beats completeness.

---

## Consulting the docs (required before every implementation)

```
Step 1: praxisjs_overview        — fast index of all available pages
Step 2: praxisjs_get_page(slug)  — full Markdown for the topic you need
```

Quick slug reference:

| Topic | Slug |
|---|---|
| Components | `essentials/components` |
| Reactivity & signals | `essentials/reactivity` |
| JSX syntax | `essentials/jsx` |
| Lifecycle hooks | `essentials/lifecycle` |
| Async data | `essentials/async-data` |
| State & Props | `decorators/state` |
| Watchers | `decorators/watchers` |
| Events & Slots | `decorators/events` |
| Performance | `decorators/performance` |
| Timing decorators | `decorators/timing` |
| Utility decorators | `decorators/utilities` |
| Router | `ecosystem/router` |
| Store | `ecosystem/store` |
| Dependency injection | `ecosystem/di` |
| Motion | `ecosystem/motion` |
| State machines | `ecosystem/fsm` |
| Concurrency | `ecosystem/concurrency` |
| DOM composables | `composables/dom` |
| Browser composables | `composables/browser` |
| Custom decorators | `advanced/custom-decorators` |
| Custom composables | `advanced/custom-composables` |
| Vite plugin | `tooling/vite-plugin` |

---

## New project setup

When starting from scratch:

```bash
pnpm create praxisjs@latest
# Choose template: minimal / router / full
```

Immediately after scaffolding:
1. Create `CLAUDE.md` at the project root (use the template in `references/claude-md.md`)
2. Add any additional packages using the CLI without specifying a version — always let the package manager resolve latest: `pnpm add @praxisjs/store @praxisjs/di`
3. Update `CLAUDE.md` with installed packages
4. Run `praxisjs_get_page('tooling/vite-plugin')` to verify the Vite plugin configuration

**Never write version numbers directly into `package.json`.** Always install via the CLI so the package manager resolves the latest compatible version:

```bash
# correct — resolves latest
pnpm add @praxisjs/router
pnpm add @praxisjs/store @praxisjs/di @praxisjs/motion

# wrong — hardcodes a version that may already be outdated
pnpm add @praxisjs/router@^0.1.0
```

The same rule applies when scaffolding files or editing `package.json` directly — never add a `@praxisjs/*` dependency with an explicit version constraint. Run the install command and let pnpm pin it.

---

## Core patterns (stable — no doc lookup needed for these)

For options and edge cases, always fetch the page. These patterns are safe to use directly.

### Component types

```ts
// Internal state → StatefulComponent
@Component()
class Counter extends StatefulComponent {
  @State() count = 0

  render() {
    return (
      <button onClick={() => this.count++}>
        {() => this.count}
      </button>
    )
  }
}

// Props only, no state → StatelessComponent
@Component()
class Badge extends StatelessComponent {
  @Prop() label = ''

  render() {
    return <span class="badge">{this.label}</span>
  }
}
```

### Reactive JSX rule

```tsx
<p>{() => this.count}</p>   // reactive — re-renders when count changes
<p>{this.count}</p>         // static — snapshot at render time, never updates
```

`render()` runs untracked. Only arrow functions in JSX create reactive bindings.

### Decorator ordering

Field decorators: **inner-first**. `@State()` / `@Prop()` must be closest to the field.

```ts
@Debug()   // outer — wraps
@State()   // inner — runs first ✓
count = 0
```

Class decorators: **bottom-up**. `@Component()` must be innermost.

```ts
@Scope(container)  // outer
@Component()       // inner — runs first ✓
class MyModule extends StatefulComponent {}
```

### Key state decorators

| Decorator | Use for |
|---|---|
| `@State()` | Reactive local field |
| `@Prop()` | External input (parent to child) |
| `@Computed()` | Derived value, memoized |
| `@Persisted()` | Synced to localStorage |
| `@Resource()` | Async data with loading/error/data |
| `@DeepState()` | Deeply reactive objects/arrays |

For all options (`immediate`, `keepPreviousData`, etc.) → fetch `decorators/state`.

---

## AI-oriented development practices

These habits make AI-assisted development significantly faster and more accurate across sessions.

**Keep CLAUDE.md as the single source of architectural truth.** Inline comments rot; CLAUDE.md stays. When you establish a pattern, document it there — not in a comment buried in a component file.

**Prefer explicit over implicit.** Annotate `@Prop()` fields with explicit types. Name stores, routes, and composables for what they represent, not what they contain (`UserSessionStore` not `Store1`).

**Write small, focused components.** A component doing one thing is trivial to modify correctly. Ask the user to split large components before making changes — AI edits large files with more risk.

**Tests are the spec.** When tests exist, Claude can modify behavior safely. For every `@State` field with side effects, every `@Watch` handler, every `@Resource` call — write a test. Tests in `src/__tests__/*.test.ts`.

**Describe intent in tasks, not steps.** Instead of "set loading to true, call the API, set loading to false", say "fetch users on mount, show a loading spinner during the request". Let the skill look up the idiomatic pattern.

**After significant changes, update CLAUDE.md immediately.** Don't defer it. The next session will be more capable if it starts with current context.

---

## Package imports

```ts
// Public API — application code and packages shipped to users
import { signal, computed, effect, peek, untrack, batch } from '@praxisjs/core'
import { StatefulComponent, StatelessComponent } from '@praxisjs/runtime'
import { Component, State, Prop, Computed, Watch, Emit } from '@praxisjs/decorators'

// Internal — only inside framework packages (foundation/**, features/**)
import type { RootComponent } from '@praxisjs/core/internal'
```

---

## Hard rules

- Never guess at decorator options — always fetch the docs page.
- Never use workarounds — if something feels like a hack, it is. Find the idiomatic path.
- Never skip the CLAUDE.md update — the next session depends on it.
- Never use `any` or non-null assertions (`!`) — strict TypeScript throughout.
- Never use `@praxisjs/*/internal` in application code — internal paths are for framework packages only.
- Never write version numbers into `package.json` — always install via `pnpm add <package>` and let the CLI resolve latest.
