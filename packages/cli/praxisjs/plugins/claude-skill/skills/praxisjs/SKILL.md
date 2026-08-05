---
name: praxisjs
description: PraxisJS development skill for Claude Code. Invoke whenever working on a PraxisJS project — creating components, managing state, setting up routing, using decorators, fetching async data, styling, prerendering, or debugging reactivity. Trigger on any mention of @praxisjs/ packages, @State, @Component, StatefulComponent, StatelessComponent, @Resource, @Watch, @Emit, @Compose, @Styled, or when the user wants to build reactive UI with TypeScript. This skill enforces three non-negotiable practices: consult praxisjs.org docs before writing code, keep CLAUDE.md updated so every future session has full project context, and follow PraxisJS conventions exactly — no workarounds.
---

# PraxisJS Development

PraxisJS is a signal-driven TypeScript frontend framework. APIs evolve — **never guess at decorator options, argument shapes, or import paths**. Always confirm against the live documentation before writing code.

## The three rules (never skip)

1. **Docs first** — call `praxisjs_overview`, then `praxisjs_get_page` for the relevant topic, before writing any PraxisJS code. This includes checking whether PraxisJS already ships what you're about to build — see [Check for a native path first](#check-for-a-native-path-first).
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

If the developer reports something feels broken (wrong TypeScript config, missing memory files, a stale integration), run `npx praxisjs doctor` — it checks `package.json`, `tsconfig.json` (`jsx`, `jsxImportSource`, `useDefineForClassFields`), and whether this Claude Code integration is fully initialized (skill, `.claude/settings.json`, `CLAUDE.md`, `.praxisjs-ai.json`).

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
5. Which styling approach does this project use?
   a) @praxisjs/css (typed, scoped, decorator-based — @Styled, @Style, tokens)
   b) Plain CSS / global stylesheet
   c) CSS Modules
   d) Tailwind CSS
   e) UnoCSS
   f) No styles from Claude (I handle CSS myself)
```

After the developer answers, write `.praxisjs-ai.json` immediately, confirm the saved config in one short message, and proceed with the original task.

### Reading the config

At the start of every session after init:
- `tests: true` → write a test file alongside every new component; tests live in `src/__tests__/`
- `codeLocale` → use this locale for identifiers, comments, and variable names
- `uiLocale` → use this locale for all user-facing strings in templates
- `i18n: true` → use the i18n integration pattern from `references/project-config.md`
- `css` → follow the styling approach when adding styles to components

---

## CLAUDE.md — persistent project memory

Without CLAUDE.md, every new Claude session starts completely blind about the project. With it, sessions are immediately productive.

**If CLAUDE.md doesn't exist: create it before writing any code.**

Use `references/claude-md.md` for the full template. Minimum required sections:

```markdown
# [Project name]

## Stack
- PraxisJS + packages: @praxisjs/[list]
- Build: Vite [version] + @praxisjs/vite-plugin
- Routing: [@praxisjs/router / none]
- State: [@praxisjs/store / none]
- Styling: [@praxisjs/css / plain / modules / tailwind / unocss / none]

## Architecture
[2–4 sentences: what the app does, how it's organized, main entry points]

## Conventions
[Project-specific patterns — e.g. "all forms extend FormBase", "stores are singletons injected via @Store"]

## Known constraints
[Anything that would surprise a developer — auth, browser targets, env vars, etc.]
```

**Update CLAUDE.md whenever you:**
- Add or remove a `@praxisjs/*` package
- Establish a new architectural pattern (base class, shared composable, store shape, stylesheet class)
- Make a decision that affects how future code should be written
- Change how routing, DI, the store, styling, or prerendering is configured

CLAUDE.md is a living document, not a log. Remove stale entries when conventions change. Keep it under one page — precision beats completeness.

---

## Consulting the docs (required before every implementation)

Four MCP tools are available from `@praxisjs/mcp`:

| Tool | When to call it |
|---|---|
| `praxisjs_overview` | First call of the session — index of every docs page |
| `praxisjs_get_page(page)` | Before implementing anything — full Markdown for one slug |
| `praxisjs_full_docs` | Only when the task spans many topics and the right page isn't obvious |
| `praxisjs_get_install_command(...)` | Whenever a `@praxisjs/*` package needs installing |

Slug reference (pass without a leading slash):

| Topic | Slug |
|---|---|
| Introduction | `guide/introduction` |
| Quick start, manual setup | `guide/getting-started` |
| AI skills / this integration | `guide/ai-skills` |
| Components (`StatefulComponent`, `StatelessComponent`) | `essentials/components` |
| Reactivity & signals | `essentials/reactivity` |
| JSX syntax | `essentials/jsx` |
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
| Performance (`@Lazy`, `VirtualList`) | `decorators/performance` |
| DevTools decorators (`@Debug`, `@Trace`) | `decorators/dx` |
| Composables overview (`@Compose`) | `composables` |
| DOM composables | `composables/dom` |
| Browser composables | `composables/browser` |
| List composables (`VirtualList`) | `composables/list` |
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
| Motion | `ecosystem/motion` |
| State machines | `ecosystem/fsm` |
| Concurrency (`@Task`, `@Queue`, `@Pool`) | `ecosystem/concurrency` |
| UI libraries (Morphos, Kosmesis) | `ecosystem/ui` |
| Custom decorators | `advanced/custom-decorators` |
| Custom composables | `advanced/custom-composables` |
| Vite plugin | `tooling/vite-plugin` |
| Static site generation | `tooling/ssg` |
| DevTools panel | `tooling/devtools` |
| DevTools plugins | `tooling/devtools-plugins` |
| Storybook adapter | `tooling/storybook` |
| MCP server | `tooling/mcp` |
| `praxisjs` CLI reference | `tooling/cli` |
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
1. praxisjs_overview             — scan the index for a page that sounds relevant
2. praxisjs_get_page(slug)       — read the most likely page(s)
3. praxisjs_full_docs            — only if the first two turned up nothing and you still suspect it exists
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
| Virtualizing a long list | `VirtualList` — `composables/list` |
| Deferring mount of an off-screen component | `@Lazy` — `decorators/performance` |
| `document.title` / meta tag updates | `@Head` — `essentials/head` |
| Rendering a modal or tooltip outside the current DOM subtree | `Portal` — `essentials/portal` |
| Status enum plus a chain of transition `if`s | `@StateMachine`, `@Transition` — `ecosystem/fsm` |
| `requestAnimationFrame` loop to animate a value | `@Tween`, `@Spring` — `ecosystem/motion` |
| Module-level singleton object holding shared state | `@Storable`, `@Store`, `store()` — `ecosystem/store` |
| Instantiating services manually and threading them down the tree | `@Injectable`, `@Inject`, `@Scope` — `ecosystem/di` |
| Limiting, queueing, or cancelling concurrent async calls | `@Task`, `@Queue`, `@Pool` — `ecosystem/concurrency` |
| Loading markdown files and parsing frontmatter | `@Collection`, `getCollection` — `ecosystem/content` |
| Composing class name strings conditionally | `cx()` — `css/cx` |
| Scoped CSS, CSS variables driven by state, design tokens | `@Styled`, `@Param`, `@Style`, `TokenSheet` — `css`, `css/reactive`, `css/tokens` |
| A decorator or composable of your own | The `create*Decorator` factories and the `Composable` base class — `advanced/custom-decorators`, `advanced/custom-composables` |
| Prerendering routes to static HTML | `@praxisjs/ssg` — `tooling/ssg` |

The table is a starting point, not the full inventory — when the case isn't listed, still check the docs before assuming nothing exists.

If the package isn't installed yet, that's not a reason to hand-roll it: resolve the install with `praxisjs_get_install_command`, mention the added dependency to the developer, and record it in CLAUDE.md.

Only after the docs confirm there is no native path should you write it yourself — and when you do, note in CLAUDE.md what you built and why nothing built-in fit, so the next session doesn't repeat the search.

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
2. Add any additional packages using the `praxisjs_get_install_command` tool — never hand-write the install command or a version number
3. Update `CLAUDE.md` with installed packages
4. Run `praxisjs_get_page('tooling/vite-plugin')` to verify the Vite plugin configuration

### Existing project maintenance

Three CLI commands cover the cases the skill itself can't fix by editing files:

- `npx praxisjs doctor` — diagnoses the project: missing `@praxisjs/*` dependencies, tsconfig options required by PraxisJS (`jsxImportSource`, `useDefineForClassFields`, `jsx`), and whether this AI integration is fully initialized (skill, config, memory file all present).
- `npx praxisjs upgrade` — bumps every `@praxisjs/*` dependency in `package.json` to its latest published version and reinstalls. Prefer this over manually editing version ranges.
- `npx praxisjs ai remove` — uninstalls an AI integration (prompts for which one). Deletes the skill directory and, for Claude Code, `.claude/settings.json`; leaves `CLAUDE.md` and `.praxisjs-ai.json` untouched.

**Never write version numbers directly into `package.json`.** Always resolve the install command through the `praxisjs_get_install_command` tool (or `praxisjs upgrade` for existing dependencies) so the package manager pins the current compatible version:

```
praxisjs_get_install_command({ packages: ["@praxisjs/router"] })
praxisjs_get_install_command({ packages: ["@praxisjs/store", "@praxisjs/di"], manager: "pnpm" })
```

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

That is the whole public export list. `signal`, `computed`, `effect`, `batch`, `resource`, `persistedSignal`, `RootComponent` and friends live in `@praxisjs/core/internal` and are **not** application API — reach for the decorator instead (`@State`, `@Computed`, `@Resource`, `@Persisted`, `@Watch`). Only use `/internal` when authoring a framework package, a custom decorator, or a custom composable, and say so in CLAUDE.md when you do.

### `@praxisjs/runtime`

`render`, `Portal`, `Scope`, `runInScope`, `getCurrentScope`, `mountElement`, `mountComponent`.

### `@praxisjs/decorators`

| Group | Decorators |
|---|---|
| Class | `@Component()`, `@Lazy()` |
| State & props | `@State`, `@Prop`, `@FunctionProp`, `@Computed`, `@DeepState`, `@Persisted`, `@History`, `@Synced`, `@Resource`, `@Ref` |
| Watchers | `@Watch`, `@When`, `@Until` |
| Events & slots | `@Emit`, `@OnCommand`, `@Command`, `@Slot` |
| Timing | `@Debounce`, `@Throttle` |
| Utilities | `@Bind`, `@Log`, `@Once`, `@Memo`, `@Retry` |
| Composition | `@Compose` |
| Helpers | `invalidateResource`, `createRef`, `createCommand`, `getter`, `initSlots` |
| Decorator factories | `createFieldDecorator`, `createMethodDecorator`, `createLifecycleMethodDecorator`, `createGetterDecorator`, `createWritableGetterDecorator`, `createGetterObserverDecorator`, `createAccessorDecorator`, `createClassDecorator` |

**Name collision to watch for:** `Lazy` is exported by **both** `@praxisjs/decorators` (defers mounting a component until it enters the viewport) and `@praxisjs/router` (wraps a dynamically imported route component). Check which package the import comes from before using it.

### Ecosystem packages

| Package | Public API |
|---|---|
| `@praxisjs/router` | `@Router`, `@Route`, `@Params`, `@Query`, `@Location`, `@Meta`, `@InjectLayout`, `Lazy()`, `RouterView`, `RouterOutlet`, `Link`, `RouterInstance`, `useMeta` |
| `@praxisjs/store` | `@Storable`, `@Store`, `store()`, `ReactiveStore`, `useStorePlugin` |
| `@praxisjs/di` | `@Injectable`, `@Inject`, `@InjectContainer`, `@Scope`, `inject()`, `Container`, `container`, `Token`, `token` |
| `@praxisjs/motion` | `@Tween`, `@Spring` |
| `@praxisjs/fsm` | `@StateMachine`, `@Transition` |
| `@praxisjs/content` | `@Collection`, `@PagedCollection`, `ContentSchema`, `getCollection`, `getEntry`, `getTotal`, `getPage`, `collectionStaticPaths` |
| `@praxisjs/head` | `@Head` |
| `@praxisjs/concurrent` | `@Task`, `@Queue`, `@Pool`, `QueueClearedError` |
| `@praxisjs/composables` | Composable classes used through `@Compose`: `WindowSize`, `ScrollPosition`, `ElementSize`, `Intersection`, `Focus`, `MediaQuery`, `ColorScheme`, `Mouse`, `KeyCombo`, `Idle`, `Clipboard`, `Geolocation`, `TimeAgo`, `Pagination`, `VirtualList` |
| `@praxisjs/css` | `Stylesheet`, `ReactiveStylesheet`, `@Styled`, `@Style`, `@Param`, `TokenSheet`, `ThemeInstance`, `theme`, `@Themed`, `@Theme`, `tokenVars`, `cx`, `keyframes`, `globalStyle`, `preflight` |

Composables are always attached with `@Compose` from `@praxisjs/decorators` — never instantiated by hand:

```tsx
@Compose(WindowSize) window!: WindowSize
```

`ReactiveStylesheet` (with `@Param()` reactive CSS vars) only works on `StatefulComponent`; use plain `Stylesheet` for stateless components.

### Tooling

| Package | Entry point |
|---|---|
| `@praxisjs/vite-plugin` | `praxisjs()` — required; `praxisjsCSS()` for build-time CSS extraction |
| `@praxisjs/ssg` | `ssgPlugin({ root })` — prerenders routes and hydrates them client-side |
| `@praxisjs/devtools` | `DevTools.init()`, dev-only dynamic import |
| `@praxisjs/storybook` | Storybook framework adapter — `Meta`, `StoryObj`, `StorybookConfig`, `renderToCanvas` |
| `@praxisjs/mcp` | The MCP server backing the four tools above |

`@praxisjs/ssg` is experimental and has a strict contract: the `root` module must default-export the root component and named-export the same `routes` array passed to `@Router([...])`. Always fetch `tooling/ssg` before touching it.

---

## AI-oriented development practices

These habits make AI-assisted development significantly faster and more accurate across sessions.

**Keep CLAUDE.md as the single source of architectural truth.** Inline comments rot; CLAUDE.md stays. When you establish a pattern, document it there — not in a comment buried in a component file.

**Prefer explicit over implicit.** Annotate `@Prop()` fields with explicit types. Name stores, routes, and composables for what they represent, not what they contain (`UserSessionStore` not `Store1`).

**Write small, focused components.** A component doing one thing is trivial to modify correctly. Ask the user to split large components before making changes — AI edits large files with more risk.

**Tests are the spec.** When tests exist, Claude can modify behavior safely. For every `@State` field with side effects, every `@Watch` handler, every `@Resource` call — write a test. Tests live in `src/__tests__/*.test.ts` and run on Vitest; add `// @vitest-environment jsdom` at the top of files that touch DOM APIs.

**Describe intent in tasks, not steps.** Instead of "set loading to true, call the API, set loading to false", say "fetch users on mount, show a loading spinner during the request". Let the skill look up the idiomatic pattern.

**After significant changes, update CLAUDE.md immediately.** Don't defer it. The next session will be more capable if it starts with current context.

---

## Hard rules

- Never guess at decorator options — always fetch the docs page.
- Never hand-roll behavior the framework already ships — search the docs for a native decorator, composable, or package export before writing custom logic, and before reaching for a third-party dependency.
- Never use workarounds — if something feels like a hack, it is. Find the idiomatic path.
- Never skip the CLAUDE.md update — the next session depends on it.
- Never use `any` or non-null assertions (`!`) in logic — strict TypeScript throughout. (`!` on a decorated field declaration, e.g. `@Resource(...) user!: ResourceInstance<User>`, is the required syntax and is fine.)
- Never import `signal`, `effect`, `computed`, or anything else from `@praxisjs/*/internal` in application code — use decorators instead.
- Never give `StatelessComponent` `@State`, `@Prop`, `@Watch`, `@Emit`, or `@Slot` — promote it to `StatefulComponent` instead.
- Never write version numbers into `package.json` — always resolve installs through `praxisjs_get_install_command` or `npx praxisjs upgrade`.
- If something in the project seems misconfigured (JSX not rendering, decorators not working, integration files missing), run `npx praxisjs doctor` before guessing at a fix.
