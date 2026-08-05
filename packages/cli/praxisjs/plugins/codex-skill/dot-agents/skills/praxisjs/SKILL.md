---
name: praxisjs
description: PraxisJS development skill for Codex. Use whenever working on a PraxisJS project — creating components, managing state, setting up routing, using decorators, fetching async data, styling, prerendering, or debugging reactivity. Trigger on any mention of @praxisjs/ packages, @State, @Component, StatefulComponent, StatelessComponent, @Resource, @Watch, @Emit, @Compose, @Styled, or building reactive TypeScript UI. Enforces three rules: consult praxisjs.org docs before writing code, keep AGENTS.md updated so every session has full project context, and follow PraxisJS conventions exactly — no workarounds.
---

# PraxisJS Development

PraxisJS is a signal-driven TypeScript frontend framework. APIs evolve — **never guess at decorator options, argument shapes, or import paths**. Always confirm against the live documentation before writing code.

## The three rules (never skip)

1. **Docs first** — call `praxisjs_overview`, then `praxisjs_get_page` for the relevant topic, before writing any PraxisJS code. This includes checking whether PraxisJS already ships what you're about to build — see [Check for a native path first](#check-for-a-native-path-first).
2. **AGENTS.md always** — read it at the start of every session; update it whenever you make a decision that future sessions need to know.
3. **No workarounds** — if the idiomatic path isn't clear, fetch the docs page. Hacks break as the framework evolves.

---

## Session start checklist (run every time)

1. **Check for `.praxisjs-ai.json`** at the project root.
   - If absent: run the [init flow](#project-config-praxisjs-aijson) before anything else.
   - If present: read it silently and let it govern all decisions for this session.
2. **Read `AGENTS.md`** — understand the current project state.
3. **Fetch docs** for the task at hand via the MCP tools.

If something feels broken (wrong TypeScript config, missing memory file, a stale integration), run `npx praxisjs doctor` — it checks `package.json`, `tsconfig.json` (`jsx`, `jsxImportSource`, `useDefineForClassFields`), and whether this Codex integration is fully initialized (skill, `AGENTS.md`, `.praxisjs-ai.json`).

---

## Project config (`.praxisjs-ai.json`)

This file captures developer preferences once so Codex never has to ask the same questions session after session.

Read `references/project-config.md` for the full config format and how each option affects code generation.

### Init flow

Run this when `.praxisjs-ai.json` is absent. Ask all questions in a single message:

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
   f) No styles from Codex (I handle CSS myself)
```

After the developer answers, write `.praxisjs-ai.json` and proceed with the original task.

---

## AGENTS.md — persistent project memory

`AGENTS.md` at the project root is read by Codex at the start of every session. Without it, every session starts blind about the project.

**If `AGENTS.md` doesn't exist: create it before writing any code.**

Use `references/agents-md.md` for the full template. Minimum required sections:

```markdown
# [Project name]

## Working agreements
- Always consult praxisjs.org docs before writing PraxisJS code
- Before hand-rolling any behavior, check the docs for a native PraxisJS decorator, composable, or package export that already does it
- Never hardcode version numbers — install packages via CLI without specifying a version
- Update this file whenever an architectural decision is made

## Stack
- PraxisJS + packages: @praxisjs/[list]
- Build: Vite [version] + @praxisjs/vite-plugin
- Routing: [@praxisjs/router / none]
- State: [@praxisjs/store / none]
- Styling: [@praxisjs/css / plain / modules / tailwind / unocss / none]

## Architecture
[2–4 sentences describing the project structure]

## Conventions
[Project-specific patterns]

## Known constraints
[Important limitations — auth, browser targets, env vars, etc.]
```

**Update `AGENTS.md` whenever you:**
- Add or remove a `@praxisjs/*` package
- Establish a new architectural pattern
- Make a decision that affects how future code should be written
- Change routing, DI, store, styling, or prerendering configuration

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

If the package isn't installed yet, that's not a reason to hand-roll it: resolve the install with `praxisjs_get_install_command`, mention the added dependency to the developer, and record it in `AGENTS.md`.

Only after the docs confirm there is no native path should you write it yourself — and when you do, note in `AGENTS.md` what you built and why nothing built-in fit, so the next session doesn't repeat the search.

---

## New project setup

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
1. Create `AGENTS.md` at the project root
2. Add additional packages via the `praxisjs_get_install_command` tool — never hand-write the install command or a version number
3. Update `AGENTS.md` with installed packages

### Existing project maintenance

- `npx praxisjs doctor` — diagnoses missing `@praxisjs/*` dependencies, required tsconfig options (`jsxImportSource`, `useDefineForClassFields`, `jsx`), and whether this AI integration is fully initialized.
- `npx praxisjs upgrade` — bumps every `@praxisjs/*` dependency to its latest published version and reinstalls.
- `npx praxisjs ai remove` — uninstalls an AI integration (prompts for which one). Deletes the skill directory and, for Codex, leaves `AGENTS.md` and `.praxisjs-ai.json` untouched.

**Never write version numbers into `package.json`.** Resolve installs through `praxisjs_get_install_command` (or `praxisjs upgrade` for existing dependencies), never by hand.

---

## Core patterns (stable — no doc lookup needed)

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
- Prefer `StatelessComponent` whenever a component has no reactive state.

### Lifecycle hooks

Both base classes expose four hooks: `onBeforeMount`, `onMount`, `onUnmount`, `onError`. Fetch `essentials/lifecycle` for ordering and error-boundary behavior.

### Mounting the app

```tsx
import { render } from '@praxisjs/runtime'
import { App } from './app'

render(() => <App />, document.getElementById('app')!)
```

`render()` returns a dispose function. If the container carries the marker `@praxisjs/ssg` writes into prerendered HTML, `render()` hydrates the existing DOM instead of clearing it — no separate `hydrate()` call.

### Reactive JSX

```tsx
<p>{() => this.count}</p>       // reactive — updates when count changes
<p>{this.count}</p>             // static — snapshot at render time
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

Field decorators: **inner-first**. `@State()` / `@Prop()` closest to the field.

```ts
@Debug()   // outer
@State()   // inner — runs first ✓
count = 0
```

Class decorators: **bottom-up**. `@Component()` innermost.

```ts
@Router([...])
@Component()   // innermost — runs first ✓
class App extends StatefulComponent {}
```

---

## API surface by package

Fetch the matching docs page before using anything below — this list is for knowing *where* something lives, not for guessing its signature.

### `@praxisjs/core` — public surface is deliberately small

```ts
import { StatefulComponent, StatelessComponent, Composable, peek, untrack } from '@praxisjs/core'
```

That is the whole public export list. `signal`, `computed`, `effect`, `batch`, `resource`, `persistedSignal`, `RootComponent` and friends live in `@praxisjs/core/internal` and are **not** application API — reach for the decorator instead (`@State`, `@Computed`, `@Resource`, `@Persisted`, `@Watch`). Only use `/internal` when authoring a framework package, a custom decorator, or a custom composable, and record that in `AGENTS.md` when you do.

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

- **Keep AGENTS.md as the single source of architectural truth** — update it after every significant decision.
- **Prefer explicit over implicit** — annotate `@Prop()` fields with explicit types, name stores and composables for what they represent.
- **Write small, focused components** — easier to modify safely.
- **Tests are the spec** — write a test for every `@State` field with side effects, every `@Watch` handler, and every `@Resource` call. Tests live in `src/__tests__/*.test.ts` and run on Vitest; add `// @vitest-environment jsdom` at the top of files that touch DOM APIs.
- **Never write version numbers** — resolve installs through `praxisjs_get_install_command` or `praxisjs upgrade`.

---

## Hard rules

- Never guess at decorator options — always fetch the docs page.
- Never hand-roll behavior the framework already ships — search the docs for a native decorator, composable, or package export before writing custom logic, and before reaching for a third-party dependency.
- Never use workarounds — find the idiomatic path.
- Never skip the AGENTS.md update — the next session depends on it.
- Never use `any` or non-null assertions (`!`) in logic — strict TypeScript throughout. (`!` on a decorated field declaration, e.g. `@Resource(...) user!: ResourceInstance<User>`, is the required syntax and is fine.)
- Never import `signal`, `effect`, `computed`, or anything else from `@praxisjs/*/internal` in application code — use decorators instead.
- Never give `StatelessComponent` `@State`, `@Prop`, `@Watch`, `@Emit`, or `@Slot` — promote it to `StatefulComponent` instead.
- Never write version numbers into `package.json` — resolve installs through `praxisjs_get_install_command` or `npx praxisjs upgrade`.
- If something in the project seems misconfigured, run `npx praxisjs doctor` before guessing at a fix.
