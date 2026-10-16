---
name: praxisjs
description: PraxisJS development skill for Claude Code. Invoke whenever working on a PraxisJS project — creating components, managing state, setting up routing, using decorators, fetching async data, styling, prerendering, extending the framework, or debugging reactivity. Trigger on any mention of @praxisjs/ packages, @State, @Component, StatefulComponent, StatelessComponent, @Resource, @Watch, @Emit, @Compose, @Styled, @Selector, For, Index, .praxis/, or when the user wants to build reactive UI with TypeScript. It requires the PraxisJS MCP server, looks every API up in the docs instead of guessing, reuses what the project and the framework already have, keeps the project's folder structure, and keeps the project memory (.praxis/, through the MCP) and CLAUDE.md current.
---

# PraxisJS Development

PraxisJS is a signal-driven TypeScript frontend framework. APIs evolve: **look them up, never guess.**

## Rules (never skip)

1. **Docs before code.** Look up every PraxisJS API you use in the docs through the MCP server: `praxisjs_search_docs` → `praxisjs_get_page`, and `praxisjs_api_reference` for one symbol. The praxisjs.org website is only the fallback while the server is not connected. Never guess decorator options, signatures or import paths.
2. **MCP connected.** The PraxisJS MCP server (`@praxisjs/mcp`) must be available. If the `praxisjs_*` tools are missing, help the developer connect it first: `references/mcp.md`.
3. **Reuse, don't duplicate.** Before creating any component, composable, store, service, decorator or helper, run `praxisjs_memory_check_duplicate`: it searches PraxisJS itself, the project memory and the code. Reuse or extend what it finds.
4. **UI from Morphos and Kosmesis first.** Before building a UI piece, check installed Kosmesis components and the registry (`praxisjs_ui_components`) and Morphos primitives; add Kosmesis components with the `kosmesis` CLI, wrap Morphos primitives, never edit `@morphos/*` in `node_modules` (`praxisjs-ui` skill).
5. **Extend PraxisJS its own way.** Custom behavior goes through the Extending PraxisJS APIs: decorator builders (`setup` form), `Composable`, store plugins, devtools plugins (`references/extending.md`). No monkeypatching, no ad-hoc wrappers.
6. **Never the `accessor` keyword.** Field decorators throw on it; PraxisJS needs plain fields.
7. **Keep the structure.** Put every file where `conventions/project-structure` says (`praxisjs_scaffold` gives the path); never in an ad-hoc place. Reorganize misplaced code you touch, asking first for large moves (`references/project-structure.md`).
8. **Project memory through the MCP only.** Never read or write `.praxis/` files yourself; use the `praxisjs_memory_*` tools, and record the reusable code, rules and decisions you add (`references/project-memory.md`).
9. **Validate.** Run `praxisjs_validate_file` on every file you create or change, and keep CLAUDE.md current.
10. **No workarounds.** If the idiomatic path isn't clear, read the docs page. Hacks break as the framework evolves.

---

## Session start checklist (run every time)

1. **MCP**: the `praxisjs_*` tools are available; if not, stop and follow `references/mcp.md`.
2. **`praxisjs_inspect_project`**: versions, pages, components, stores, routes, folder layout, UI libraries, and whether the project memory is set up. It runs before the questions below because question 6 depends on it.
3. **`.praxisjs-ai.json`** at the project root:
   - If it **doesn't exist**: run the [init flow](#project-config-praxisjs-aijson) before anything else (question 6 included when the project memory is not set up).
   - If it **exists**: read it silently and let it govern all decisions for this session. If the project memory is not set up and the file has no `memory` answer, ask question 6 alone and save the answer.
4. **`CLAUDE.md`**: read it for the stack and constraints.
5. **Project memory**, when it is not set up, by the `memory` answer. Never start a full analysis the developer didn't ask for.
   - `"scaffold"`: `praxisjs_memory_init` only (it records `conventions/project-structure` and, with Morphos/Kosmesis, `conventions/ui-libraries`), no analysis. Tell the developer the memory grows as you add code, and that the `praxisjs-memory-bootstrap` skill maps the project later, once it has code written outside these sessions.
   - `"map"`: run the `praxisjs-memory-bootstrap` skill (a full analysis recorded through the MCP) and tell the developer.
   - If a memory tool says `.praxis/` is in an older format, or `npx praxisjs doctor` reports an outdated AI setup, follow the `praxisjs-ai-setup` skill.
6. **`praxisjs_memory_search`** with the task's words: reusable code, business rules and conventions that apply.
7. **Docs** for the task: `praxisjs_search_docs`, then `praxisjs_get_page`. Then the developer's task.

If the developer reports something feels broken (wrong TypeScript config, missing memory files, a stale integration), run `npx praxisjs doctor`: it checks `package.json`, whether the installed `@praxisjs/*` versions work together, `tsconfig.json` (`jsx`, `jsxImportSource`, `useDefineForClassFields`), and whether this Claude Code integration is complete (skills, MCP server configuration, `CLAUDE.md`, `.praxisjs-ai.json`).

## Other PraxisJS skills

| Task | Skill |
|---|---|
| Create or change a component or page | `praxisjs-component` |
| Create a custom decorator | `praxisjs-decorator` |
| Create a composable | `praxisjs-composable` |
| Shared state, stores, services | `praxisjs-store` |
| Write or fix tests | `praxisjs-testing` |
| Something is slow | `praxisjs-performance` |
| Upgrade PraxisJS, migrate removed APIs | `praxisjs-upgrade` |
| Read or maintain the project memory | `praxisjs-memory` |
| First full analysis of the project into the memory | `praxisjs-memory-bootstrap` |
| Morphos primitives, Kosmesis components | `praxisjs-ui` |
| Update an older project's skills, MCP config, memory format | `praxisjs-ai-setup` |

---

## Project config (`.praxisjs-ai.json`)

This file captures developer preferences once so Claude never has to ask the same questions session after session. It is the single source of truth for how code should be generated in this project.

Read `references/project-config.md` for the full config format, option descriptions, and how each setting affects code generation.

### Init flow

Run this when `.praxisjs-ai.json` is absent. Ask the questions below **all at once in a single message** — do not scatter them across multiple turns. Include question 6 only when `praxisjs_inspect_project` says the project memory is not set up, with a suggested answer from what it found: `scaffold` when the project has only the files its template created, `map` when it has code of its own.

```
I need to set up your PraxisJS project preferences so I don't have to ask
these questions every session. Please answer all of them:

1. Should I write tests for every new component and behavior? (yes / no)
2. What language should identifiers and code comments be in? (e.g. en, pt, es)
3. What language should user-facing UI strings be in? (e.g. en, pt-BR, es)
4. Should I set up i18n (internationalization) support? (yes / no)
5. Which styling approach does this project use?
   a) @praxisjs/css (typed, scoped, decorator-based — @Styled, @Style, tokens)
   b) Plain CSS / global stylesheet
   c) CSS Modules
   d) Tailwind CSS
   e) UnoCSS
   f) No styles from Claude (I handle CSS myself)
6. Is this project still the empty scaffold, or should I map the existing code
   into the project memory now? (scaffold / map) — this looks like [an untouched
   scaffold / a project with code of its own], so I suggest [scaffold / map].
```

After the developer answers, write `.praxisjs-ai.json` immediately (`memory` holds the answer to question 6), confirm the saved config in one short message, set up the project memory as that answer says (step 5 of the checklist), and proceed with the original task.

### Reading the config

At the start of every session after init:
- `tests: true` → write a test file for every new component and behavior (`praxisjs-testing`)
- `codeLocale` → use this locale for identifiers, comments, and variable names
- `uiLocale` → use this locale for all user-facing strings in templates
- `i18n: true` → use the i18n integration pattern from `references/project-config.md`
- `css` → follow the styling approach when adding styles to components
- `memory` → how the project memory was set up: `"scaffold"` (initialized without an analysis) or `"map"` (mapped by the `praxisjs-memory-bootstrap` skill). Never ask question 6 again once it is set

---

## CLAUDE.md and the project memory

Two places hold project knowledge, with different jobs:

| | `CLAUDE.md` | `.praxis/` (project memory) |
|---|---|---|
| Holds | stack, entry points, how to run things, constraints, a pointer to the project memory | reusable components and utilities, business rules, architecture decisions, conventions, glossary |
| Read/write | directly | only through the `praxisjs_memory_*` MCP tools |
| Size | one page | as many entries as the project needs |

**If CLAUDE.md doesn't exist: create it before writing any code** (template: `references/claude-md.md`). Minimum sections:

```markdown
# [Project name]

## Stack
- PraxisJS + packages: @praxisjs/[list]
- Build: Vite [version] + @praxisjs/vite-plugin
- Routing: [@praxisjs/router / none]
- State: [@praxisjs/store / none]
- Styling: [@praxisjs/css / plain / modules / tailwind / unocss / none]

## Architecture
[2–4 sentences: what the app does, main entry points]

## Project memory
Reusable code, business rules, decisions and conventions live in `.praxis/`, read and changed only
through the PraxisJS MCP server (`praxisjs_memory_*` tools).

## Known constraints
[Anything that would surprise a developer — auth, browser targets, env vars, etc.]
```

**Update CLAUDE.md** when the stack, entry points or constraints change. **Update the project memory** (not CLAUDE.md) when you add, change, move or remove reusable code, and when a business rule, architecture decision or convention is established. Don't copy memory entries into CLAUDE.md.

---

## Consulting the docs (required before every implementation)

| Tool | When to call it |
|---|---|
| `praxisjs_search_docs({ query })` | First: find the page and section for a topic, or whether PraxisJS already covers something |
| `praxisjs_get_page({ page })` | Before implementing anything — full Markdown for one slug |
| `praxisjs_api_reference({ symbol })` | One export: package, kind, signature of the installed version, docs section |
| `praxisjs_list_apis({ kind, package })` | All decorators / composables / components of a kind |
| any docs tool with `library: "morphos"` / `"kosmesis"` | The Morphos and Kosmesis docs |
| `praxisjs_ui_components({ query })` | Kosmesis components: registry, installed, outdated |
| `praxisjs_overview` | The index of every docs page |
| `praxisjs_full_docs` | Only when the task spans many topics (large) |
| `praxisjs_get_install_command(...)` | Whenever a `@praxisjs/*` package needs installing |

Every other tool (project inspection, validation, scaffolding, project memory) is listed in `references/mcp.md`.

Slug reference (pass without a leading slash):

| Topic | Slug |
|---|---|
| Introduction | `guide/introduction` |
| Quick start, manual setup | `guide/getting-started` |
| AI skills / this integration | `guide/ai-skills` |
| Components (`StatefulComponent`, `StatelessComponent`) | `essentials/components` |
| Reactivity & signals | `essentials/reactivity` |
| JSX syntax | `essentials/jsx` |
| Lists (`For`, `Index`, keyed `.map()`) | `essentials/lists` |
| Lifecycle hooks | `essentials/lifecycle` |
| Async data (`@Resource`) | `essentials/async-data` |
| Portal | `essentials/portal` |
| Document head (`@Head`) | `essentials/head` |
| Decorator index (all categories) | `decorators` |
| State & Props | `decorators/state` |
| Watchers | `decorators/watchers` |
| Events & Slots | `decorators/events` |
| Timing (`@Debounce`, `@Throttle`) | `decorators/timing` |
| Utilities (`@Bind`, `@Log`, `@Once`, `@Memo`, `@Retry`) | `decorators/utilities` |
| Performance (`@Lazy`, `@Selector`, `VirtualList`) | `decorators/performance` |
| DevTools decorators (`@Debug`, `@Trace`) | `decorators/dx` |
| Composables overview (`@Compose`) | `composables` |
| DOM composables | `composables/dom` |
| Browser composables | `composables/browser` |
| List composables (`VirtualList`) | `composables/list` |
| File upload composables (`FileSelection`, `DropZone`, `FileUpload`, `FilePreview`) | `composables/upload` |
| CSS overview | `css` |
| Stylesheet classes | `css/stylesheets` |
| Fluent builder (`this.css({})`) | `css/builder` |
| Reactive CSS (`@Param`, `@Style`) | `css/reactive` |
| Design tokens (`TokenSheet`, `@Themed`) | `css/tokens` |
| `keyframes()` | `css/keyframes` |
| `cx()` | `css/cx` |
| `globalStyle()`, `preflight()` | `css/global-style` |
| Content collections | `ecosystem/content` |
| Router | `ecosystem/router` |
| Store | `ecosystem/store` |
| Dependency injection | `ecosystem/di` |
| Motion (`@Tween`, `@Spring`, `createTransition`) | `ecosystem/motion` |
| State machines | `ecosystem/fsm` |
| Concurrency (`@Task`, `@Queue`, `@Pool`) | `ecosystem/concurrency` |
| UI libraries (Morphos, Kosmesis) | `ecosystem/ui` |
| Custom decorators | `advanced/custom-decorators` |
| Custom composables | `advanced/custom-composables` |
| Vite plugin (compiled templates, keyed lists) | `tooling/vite-plugin` |
| Static site generation | `tooling/ssg` |
| DevTools panel (Performance tab, profiler) | `tooling/devtools` |
| DevTools plugins | `tooling/devtools-plugins` |
| Storybook adapter | `tooling/storybook` |
| MCP server | `tooling/mcp` |
| `praxisjs` CLI reference | `tooling/cli` |
| Benchmarks vs other frameworks | `performance` |
| Why PraxisJS is fast | `performance/why-it-is-fast` |
| Writing fast PraxisJS code | `performance/writing-fast-code` |
| Package list & versions | `packages` |
| Internal APIs (framework authors only) | `internal/core`, `internal/shared` |

---

## Check for a native path first

**Before implementing anything you're not certain about, search the docs for an existing solution.** PraxisJS covers far more ground than it looks like from the core package — most "obvious" hand-rolled utilities already exist as a decorator, a composable, or a package export. Writing your own duplicates behavior, misses edge cases the framework already handles, and rots when the framework evolves.

This applies to three situations, every time:

1. **Before writing custom logic** — ask "does PraxisJS already do this?" before writing the first line.
2. **When unsure how to approach something** — don't pick the first plausible design. Check whether the framework has an opinion.
3. **Before adding a third-party dependency** — check for a first-party equivalent first. If one exists, use it and say so.

How to check:

```
1. praxisjs_memory_check_duplicate({ description }) — PraxisJS, the project memory and the code at once
2. praxisjs_search_docs({ query })                  — the docs sections that match
3. praxisjs_get_page({ page })                       — read the most likely page(s)
```

Common cases — if you're about to hand-roll the left column, read the right one first:

| About to write by hand | Check this instead |
|---|---|
| `setTimeout` wrapper to delay an input handler | `@Debounce`, `@Throttle` — `decorators/timing` |
| Manual `loading` / `error` / `data` flags around a `fetch` | `@Resource` — `essentials/async-data` |
| `localStorage` read/write sync on a field | `@Persisted` — `decorators/state` |
| Cross-tab state sync | `@Synced` — `decorators/state` |
| Undo/redo stack | `@History` — `decorators/state` |
| Caching a derived value, memoizing a method | `@Computed`, `@Memo` — `decorators/state`, `decorators/utilities` |
| Manual subscription or side effect when a field changes | `@Watch`, `@When`, `@Until` — `decorators/watchers` |
| `.bind(this)` in a constructor | `@Bind` — `decorators/utilities` |
| Retry loop with backoff, run-once guard | `@Retry`, `@Once` — `decorators/utilities` |
| `resize` / `scroll` listeners, `IntersectionObserver`, `ResizeObserver`, focus tracking | `@Compose` + `composables/dom` |
| `matchMedia`, dark mode, mouse position, key combos, idle detection, clipboard, geolocation, relative time, pagination math | `composables/browser` |
| Re-rendering a whole list on every change, or diffing rows by hand | `For` / `Index` — `essentials/lists` |
| Every row comparing itself against a `selected` field | `@Selector` — `decorators/performance` |
| Adding/removing CSS classes to animate list rows in and out | `createTransition()` + `For`'s `transition` prop — `ecosystem/motion`, `essentials/lists` |
| Virtualizing a long list | `VirtualList` — `composables/list` |
| File inputs, drag-and-drop, upload progress, image previews | `FileSelection`, `DropZone`, `FileUpload`, `FilePreview` — `composables/upload` |
| Deferring mount of an off-screen component | `@Lazy` — `decorators/performance` |
| `document.title` / meta tag updates | `@Head` — `essentials/head` |
| Rendering a modal or tooltip outside the current DOM subtree | `Portal` — `essentials/portal` |
| A dialog, menu, select, tabs, tooltip, accordion, slider… with keyboard and ARIA handling | A Morphos primitive or a Kosmesis component — `praxisjs-ui` skill, `praxisjs_ui_components` |
| A styled button, input, card, table, form field from scratch | An installed or registry Kosmesis component (`npx kosmesis add <name>`) — `ecosystem/ui` |
| Status enum plus a chain of transition `if`s | `@StateMachine`, `@Transition` — `ecosystem/fsm` |
| `requestAnimationFrame` loop to animate a value | `@Tween`, `@Spring` — `ecosystem/motion` |
| Module-level singleton object holding shared state | `@Storable`, `@Store`, `store()` — `ecosystem/store` |
| Instantiating services manually and threading them down the tree | `@Injectable`, `@Inject`, `@Scope` — `ecosystem/di` |
| Limiting, queueing, or cancelling concurrent async calls | `@Task`, `@Queue`, `@Pool` — `ecosystem/concurrency` |
| Loading markdown files and parsing frontmatter | `@Collection`, `getCollection` — `ecosystem/content` |
| Composing class name strings conditionally | `cx()` — `css/cx` |
| Scoped CSS, CSS variables driven by state, design tokens | `@Styled`, `@Param`, `@Style`, `TokenSheet` — `css`, `css/reactive`, `css/tokens` |
| A decorator or composable of your own | The decorator builders (`setup` form) and the `Composable` base class — `advanced/custom-decorators`, `advanced/custom-composables`, `references/extending.md` |
| Code copied into every store (logging, persistence) | A store plugin, `useStorePlugin` — `ecosystem/store` |
| A debugging panel of your own | A devtools plugin, `DevTools.registerPlugin` — `tooling/devtools-plugins` |
| Prerendering routes to static HTML | `@praxisjs/ssg` — `tooling/ssg` |
| `console.log` / `debugger` in a setter or method to see what changed and why | `@Debug({ log, break })` — `decorators/dx` |
| `performance.now()` around renders to find slow components | `@Trace({ slow })`, the devtools profiler and Performance tab — `decorators/dx`, `tooling/devtools` |

The table is a starting point, not the full inventory — when the case isn't listed, still check the docs before assuming nothing exists.

If the package isn't installed yet, that's not a reason to hand-roll it: resolve the install with `praxisjs_get_install_command`, mention the added dependency to the developer, and add it to the Stack section of CLAUDE.md.

Only after PraxisJS, the project memory and the code have nothing that fits should you write it yourself — and when you do, record it in the project memory (`praxisjs_memory_add`), with why nothing existing fit, so the next session reuses it instead of writing it again.

---

## Extending PraxisJS

When nothing fits, extend the framework with the APIs it is built on (full guide: `references/extending.md`; docs: `advanced/custom-decorators`, `advanced/custom-composables`):

| Need | API |
|---|---|
| Field, method, getter or class behavior | `createFieldDecorator`, `createMethodDecorator`, `createLifecycleMethodDecorator`, `createGetterDecorator`, `createWritableGetterDecorator`, `createGetterObserverDecorator`, `createClassDecorator` + `ClassBehavior` |
| Reusable reactive logic with state | `class X extends Composable` + `@Compose(X)` |
| Behavior for every store | `useStorePlugin` |
| A devtools tab | a `DevtoolsPlugin` with `DevTools.init({ plugins })` / `DevTools.registerPlugin` |

Prefer the builders' `setup` form (shared per member, state in symbol slots), give each decorator a `label`, and never use or require the `accessor` keyword.

---

## Project structure

Follow the layout the project already has: `conventions/project-structure` in the project memory, applied by `praxisjs_scaffold`. `references/project-structure.md` shows two example layouts — by kind (the templates' default: `src/pages`, `src/components`, `src/stores`, `src/composables`, `src/services`, `src/decorators`, `src/utils`, `src/styles`, tests in `src/__tests__`) and feature slices (`src/app`, `src/features/<feature>/` with an `index.ts` public API, `src/shared/`). They are examples: propose one only for a new project or when the developer asks to reorganize; in a feature-slice project, import other features only through their `index.ts` and never import features from `shared/`. File names are kebab-case after the main export. When you find misplaced code, propose where it belongs; move small things as part of the task, ask before large moves, then run `praxisjs_memory_map` and update moved entries.

---

## New project setup

When starting from scratch:

```bash
pnpm create praxisjs@latest
# Choose template: minimal / router / full / blog
```

| Template | What it includes |
|---|---|
| `minimal` | core, decorators, jsx, runtime |
| `router` | minimal + `@praxisjs/router` |
| `full` | router + store, di, composables, concurrent, devtools |
| `blog` | router + `@praxisjs/content` markdown collections |

Immediately after scaffolding:
1. Create `CLAUDE.md` at the project root (use the template in `references/claude-md.md`)
2. Run `praxisjs_memory_init` to set up the project memory (`.praxis/`, committed with the code)
3. Add any additional packages using the `praxisjs_get_install_command` tool — never hand-write the install command or a version number
4. Update `CLAUDE.md` with installed packages
5. Run `praxisjs_get_page('tooling/vite-plugin')` to verify the Vite plugin configuration

### Existing project maintenance

Three CLI commands cover the cases the skill itself can't fix by editing files:

- `npx praxisjs doctor` — diagnoses the project: missing `@praxisjs/*` dependencies, `@praxisjs/*` versions that don't work together (e.g. `@praxisjs/vite-plugin` 4.1+ with a `@praxisjs/runtime` older than 0.8), tsconfig options required by PraxisJS (`jsxImportSource`, `useDefineForClassFields`, `jsx`), and whether this AI integration is complete (skills, MCP server configuration, memory file).
- `npx praxisjs upgrade` — bumps every `@praxisjs/*` dependency in `package.json` to its latest published version and reinstalls. Prefer this over manually editing version ranges.
- `npx praxisjs ai remove` — uninstalls an AI integration (prompts for which one). Deletes the PraxisJS skills and removes the `praxisjs` MCP server from the project configuration; leaves `CLAUDE.md`, `.praxisjs-ai.json` and `.praxis/` untouched.

**Never write version numbers directly into `package.json`.** Always resolve the install command through the `praxisjs_get_install_command` tool (or `praxisjs upgrade` for existing dependencies) so the package manager pins the current compatible version:

```
praxisjs_get_install_command({ packages: ["@praxisjs/router"], dev: false })
praxisjs_get_install_command({ packages: ["@praxisjs/store", "@praxisjs/di"], manager: "pnpm", dev: false })
praxisjs_get_install_command({ packages: ["@praxisjs/ssg"], manager: "pnpm" })
```

`dev` defaults to `true`. Pass `dev: false` for packages the app imports at runtime (core, decorators, jsx, runtime, router, store, …); leave it for build tooling (vite-plugin, ssg, storybook, devtools, mcp).

The same rule applies when scaffolding files or editing `package.json` directly — never add a `@praxisjs/*` dependency with an explicit version constraint by hand.

---

## Core patterns (stable — no doc lookup needed for these)

For options and edge cases, always fetch the page. These patterns are safe to use directly.

### Component types

Both base classes come from `@praxisjs/core` and both require `@Component()` plus a `render()` method.

```tsx
// Internal state, watchers, events, slots → StatefulComponent
import { StatefulComponent } from '@praxisjs/core'
import { Component, State, Prop } from '@praxisjs/decorators'

@Component()
class Counter extends StatefulComponent {
  @Prop() start = 0
  @State() count = 0

  onMount() {
    this.count = this.start
  }

  render() {
    return (
      <button onClick={() => this.count++}>
        {() => this.count}
      </button>
    )
  }
}
```

```tsx
// Renders only from props → StatelessComponent, props via a generic type
import { StatelessComponent } from '@praxisjs/core'
import { Component } from '@praxisjs/decorators'

interface BadgeProps {
  label: string
}

@Component()
class Badge extends StatelessComponent<BadgeProps> {
  render() {
    return <span class="badge">{this.props.label}</span>
  }
}
```

Rules that hold in every project:

- `StatelessComponent<T>` declares props as a **generic type parameter** and reads them through `this.props` (it also gets a typed `children` prop for free). It does not use `@Prop()`, `@State`, `@Watch`, `@Emit`, or `@Slot`.
- `StatefulComponent` declares props with `@Prop()` / `@FunctionProp()` and reads them as plain fields. It has no public `this.props`.
- Prefer `StatelessComponent` whenever a component has no reactive state — it signals intent and prevents accidental state.

### Lifecycle hooks

Both base classes expose four hooks: `onBeforeMount`, `onMount`, `onUnmount`, `onError`. Fetch `essentials/lifecycle` for ordering and error-boundary behavior.

### Mounting the app

```tsx
import { render } from '@praxisjs/runtime'
import { App } from './app'

render(() => <App />, document.getElementById('app')!)
```

`render()` returns a dispose function. If the container carries the marker `@praxisjs/ssg` writes into prerendered HTML, `render()` hydrates the existing DOM instead of clearing it — no separate `hydrate()` call.

### Reactive JSX rule

```tsx
<p>{() => this.count}</p>       // reactive — re-renders when count changes
<p>{this.count}</p>             // static — snapshot at render time, never updates
<p>{() => this.count * 2}</p>   // reactive — any expression inside the arrow works
```

`render()` runs once, untracked. Only arrow functions in JSX create reactive bindings.

### Signals track references, not mutations

```tsx
this.items = [...this.items, next]          // ✅ triggers update
this.config = { ...this.config, a: 1 }      // ✅ triggers update
this.items.push(next)                       // ❌ no update
```

Use `@DeepState()` when deep mutation tracking is genuinely needed.

### Lists

Render arrays with `For` (rows kept per key) or `Index` (rows kept per position) from `@praxisjs/runtime`. Each row renders once; `item()` and `index()` are accessors, reactive inside arrows like any other value:

```tsx
import { For } from '@praxisjs/runtime'

<For each={() => this.todos} by="id" fallback={<li>Nothing to do</li>}>
  {(todo, index) => <li>{() => `${index() + 1}. ${todo().title}`}</li>}
</For>
```

A keyed `{() => list.map((item) => <Row key={item.id} />)}` is rewritten into `For` by the Vite plugin, but writing `For` directly is better: it updates bindings in place instead of re-rendering a changed row. When every row checks `this.selected === row.id`, use `@Selector('selected') isSelected!: Selector<number>` and read `this.isSelected(row.id)`, so a selection change only re-runs two rows. Fetch `essentials/lists` and `decorators/performance` for the details.

### Decorator ordering

Field decorators: **inner-first**. `@State()` / `@Prop()` must be closest to the field.

```ts
@Debug()   // outer — wraps
@State()   // inner — runs first ✓
count = 0
```

Class decorators: **bottom-up**. `@Component()` must be innermost.

```ts
@Router([...])     // outer
@Component()       // inner — runs first ✓
class App extends StatefulComponent {}
```

---

## API surface by package

Fetch the matching docs page before using anything below — this list is for knowing *where* something lives, not for guessing its signature.

### `@praxisjs/core` — public surface is deliberately small

```ts
import { StatefulComponent, StatelessComponent, Composable, peek, untrack } from '@praxisjs/core'
```

That is the whole public export list. `signal`, `computed`, `effect`, `batch`, `selector`, `resource`, `persistedSignal`, `RootComponent` and friends live in `@praxisjs/core/internal` and are **not** application API — reach for the decorator instead (`@State`, `@Computed`, `@Selector`, `@Resource`, `@Persisted`, `@Watch`). Only use `/internal` when authoring a framework package, a custom decorator, or a custom composable, and say so in CLAUDE.md when you do.

### `@praxisjs/runtime`

`render`, `enableHydration`, `For`, `Index`, `Portal`, `Scope`, `runInScope`, `getCurrentScope`, `mountElement`, `mountChildren`, `mountComponent`. The `_$`-prefixed exports (`_$template`, `_$insert`, …) are what the Vite plugin's compiled templates call — never use them by hand.

### `@praxisjs/decorators`

| Group | Decorators |
|---|---|
| Class | `@Component()`, `@Lazy()` |
| State & props | `@State`, `@Prop`, `@FunctionProp`, `@Computed`, `@DeepState`, `@Persisted`, `@History`, `@Synced`, `@Resource`, `@Ref` |
| Performance | `@Lazy` (class), `@Selector` (field, typed with the `Selector<K>` type) |
| Watchers | `@Watch`, `@When`, `@Until` |
| Events & slots | `@Emit`, `@OnCommand`, `@Command`, `@Slot` |
| Timing | `@Debounce`, `@Throttle` |
| Utilities | `@Bind`, `@Log`, `@Once`, `@Memo`, `@Retry` |
| Composition | `@Compose` |
| Helpers | `invalidateResource`, `createRef`, `createCommand`, `getter`, `initSlots` |
| Decorator builders | `createFieldDecorator`, `createMethodDecorator`, `createLifecycleMethodDecorator`, `createGetterDecorator`, `createWritableGetterDecorator`, `createGetterObserverDecorator`, `createClassDecorator` + `ClassBehavior`; `assertFieldContext`, `addClaimableInitializer` for TC39-API decorators (prefer the shared `setup` form; no `accessor` fields) |

**Name collision to watch for:** `Lazy` is exported by **both** `@praxisjs/decorators` (defers mounting a component until it enters the viewport) and `@praxisjs/router` (wraps a dynamically imported route component). Check which package the import comes from before using it.

### Ecosystem packages

| Package | Public API |
|---|---|
| `@praxisjs/router` | `@Router`, `@Route`, `@Params`, `@Query`, `@Location`, `@Meta`, `@InjectLayout`, `Lazy()`, `RouterView`, `RouterOutlet`, `Link`, `RouterInstance`, `useMeta` |
| `@praxisjs/store` | `@Storable`, `@Store`, `store()`, `ReactiveStore`, `useStorePlugin` |
| `@praxisjs/di` | `@Injectable`, `@Inject`, `@InjectContainer`, `@Scope`, `inject()`, `Container`, `container`, `Token`, `token` |
| `@praxisjs/motion` | `@Tween`, `@Spring`, `createTransition()` (enter/leave hooks for `For`/`Index`) |
| `@praxisjs/fsm` | `@StateMachine`, `@Transition` |
| `@praxisjs/content` | `@Collection`, `@PagedCollection`, `ContentSchema`, `getCollection`, `getEntry`, `getTotal`, `getPage`, `collectionStaticPaths` |
| `@praxisjs/head` | `@Head` |
| `@praxisjs/concurrent` | `@Task`, `@Queue`, `@Pool`, `QueueClearedError` |
| `@praxisjs/composables` | Composable classes used through `@Compose`: `WindowSize`, `ScrollPosition`, `ElementSize`, `Intersection`, `Focus`, `MediaQuery`, `ColorScheme`, `Mouse`, `KeyCombo`, `Idle`, `Clipboard`, `Geolocation`, `TimeAgo`, `Pagination`, `VirtualList`, `FileSelection`, `DropZone`, `FileUpload`, `FilePreview`; helpers `formatFileSize`, `validateFiles` |
| `@praxisjs/css` | `Stylesheet`, `ReactiveStylesheet`, `@Styled`, `@Style`, `@Param`, `TokenSheet`, `ThemeInstance`, `theme`, `@Themed`, `@Theme`, `tokenVars`, `cx`, `keyframes`, `globalStyle`, `preflight` |

Composables are always attached with `@Compose` from `@praxisjs/decorators` — never instantiated by hand:

```tsx
@Compose(WindowSize) window!: WindowSize
```

`ReactiveStylesheet` (with `@Param()` reactive CSS vars) only works on `StatefulComponent`; use plain `Stylesheet` for stateless components.

### Tooling

| Package | Entry point |
|---|---|
| `@praxisjs/vite-plugin` | `praxisjs()` — required. Compiles JSX into cloned templates (`templates`) and rewrites keyed `.map()` into `For` (`keyedLists`), both on by default; `praxisjsCSS()` for build-time CSS extraction |
| `@praxisjs/ssg` | `ssgPlugin({ root })` — prerenders routes and hydrates them client-side |
| `@praxisjs/devtools` | `DevTools.init()`, dev-only dynamic import. `@Debug({ label, log: boolean \| "trace", break: boolean \| (next, prev) => boolean })` on fields, getters and methods; `@Trace({ slow: ms })` warns about renders slower than `slow`; `Registry.instance.profiler` (`start()`, `stop()`, `reset()`, `snapshot()`) and the `PerformancePlugin` tab for profiling; the `__PRAXIS_DEVTOOLS__` console global. Both decorators are no-ops in production builds |
| `@praxisjs/storybook` | Storybook framework adapter — `Meta`, `StoryObj`, `StorybookConfig`. Registers `renderToCanvas` and a default `render` itself, so `.storybook/preview.ts` needs no setup |
| `@praxisjs/mcp` | The MCP server: docs, API reference, project inspection, validation, scaffolding and the project memory (`references/mcp.md`) |

`@praxisjs/ssg` is experimental and has a strict contract: the `root` module must default-export the root component and named-export the same `routes` array passed to `@Router([...])`. Always fetch `tooling/ssg` before touching it.

---

## AI-oriented development practices

**Prefer explicit over implicit.** Annotate `@Prop()` fields with explicit types. Name stores, routes, and composables for what they represent, not what they contain (`UserSessionStore` not `Store1`).

**Write small, focused components.** A component doing one thing is trivial to modify correctly. Ask the user to split large components before making changes — AI edits large files with more risk.

**Tests are the spec.** When tests exist, Claude can modify behavior safely. For every `@State` field with side effects, every `@Watch` handler, every `@Resource` call — write a test (`praxisjs-testing`).

**Describe intent in tasks, not steps.** Instead of "set loading to true, call the API, set loading to false", say "fetch users on mount, show a loading spinner during the request". Let the skill look up the idiomatic pattern.

**Record as you go.** Update the project memory right after adding reusable code or agreeing on a rule, and CLAUDE.md right after a stack change. The next session starts from what you recorded.

---

## Hard rules

- Never guess at decorator options, signatures or import paths — look them up (`praxisjs_search_docs`, `praxisjs_get_page`, `praxisjs_api_reference`).
- Never write PraxisJS code without the MCP server connected; help the developer connect it first.
- Never hand-roll behavior the framework or the project already has — `praxisjs_memory_check_duplicate` first, and check for a first-party package before a third-party dependency.
- Never build a UI piece Kosmesis or Morphos already provides; never copy Kosmesis files by hand or edit `@morphos/*` in `node_modules`.
- Never use the `accessor` keyword.
- Never create files in ad-hoc places — follow `conventions/project-structure` (`praxisjs_scaffold`).
- Never read or write `.praxis/` files directly — only the `praxisjs_memory_*` tools.
- Never use workarounds — if something feels like a hack, it is. Find the idiomatic path.
- Never skip the CLAUDE.md or project memory update — the next session depends on it.
- Never use `any` or non-null assertions (`!`) in logic — strict TypeScript throughout. (`!` on a decorated field declaration, e.g. `@Resource(...) user!: ResourceInstance<User>`, is the required syntax and is fine.)
- Never import `signal`, `effect`, `computed`, or anything else from `@praxisjs/*/internal` in application code — use decorators instead (custom decorators and composables are the exception).
- Never give `StatelessComponent` `@State`, `@Prop`, `@Watch`, `@Emit`, or `@Slot` — promote it to `StatefulComponent` instead.
- Never write version numbers into `package.json` — always resolve installs through `praxisjs_get_install_command` or `npx praxisjs upgrade`.
- Always run `praxisjs_validate_file` on what you created or changed.
- If something in the project seems misconfigured (JSX not rendering, decorators not working, integration files missing), run `npx praxisjs doctor` before guessing at a fix.
