---
name: praxisjs
description: PraxisJS development skill for Codex. Use whenever working on a PraxisJS project — creating components, managing state, setting up routing, using decorators, fetching async data, styling, or debugging reactivity. Trigger on any mention of @praxisjs/ packages, @State, @Component, StatefulComponent, StatelessComponent, @Resource, @Watch, @Emit, or building reactive TypeScript UI. Enforces three rules: consult praxisjs.org docs before writing code, keep AGENTS.md updated so every session has full project context, and follow PraxisJS conventions exactly — no workarounds.
---

# PraxisJS Development

PraxisJS is a signal-driven TypeScript frontend framework. APIs evolve — **never guess at decorator options, argument shapes, or import paths**. Always confirm against the live documentation before writing code.

## The three rules (never skip)

1. **Docs first** — call `praxisjs_overview`, then `praxisjs_get_page` for the relevant topic, before writing any PraxisJS code.
2. **AGENTS.md always** — read it at the start of every session; update it whenever you make a decision that future sessions need to know.
3. **No workarounds** — if the idiomatic path isn't clear, fetch the docs page. Hacks break as the framework evolves.

---

## Session start checklist (run every time)

1. **Check for `.praxisjs-ai.json`** at the project root.
   - If absent: run the [init flow](#project-config-praxisjs-aijson) before anything else.
   - If present: read it silently and let it govern all decisions for this session.
2. **Read `AGENTS.md`** — understand the current project state.
3. **Fetch docs** for the task at hand via the MCP tools.

If something feels broken (wrong TypeScript config, missing memory file, a stale integration), run `npx praxisjs doctor` — it checks `package.json`, `tsconfig.json`, and whether this Codex integration is fully initialized (skill, `AGENTS.md`, `.praxisjs-ai.json`).

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
- Change routing, DI, store, or styling configuration

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
| JSX | `essentials/jsx` |
| Lifecycle hooks | `essentials/lifecycle` |
| Async data | `essentials/async-data` |
| Document head (`@Head`) | `essentials/head` |
| Portal | `essentials/portal` |
| State & Props | `decorators/state` |
| Watchers | `decorators/watchers` |
| Events & Slots | `decorators/events` |
| DevTools decorators (`@Debug`, `@Trace`) | `decorators/dx` |
| Router | `ecosystem/router` |
| Store | `ecosystem/store` |
| Dependency injection | `ecosystem/di` |
| Motion | `ecosystem/motion` |
| State machines | `ecosystem/fsm` |
| Content collections | `ecosystem/content` |
| Concurrency | `ecosystem/concurrency` |
| DOM composables | `composables/dom` |
| Browser composables | `composables/browser` |
| List composables (`VirtualList`) | `composables/list` |
| CSS (`@praxisjs/css`) | `css/index` |
| Custom decorators | `advanced/custom-decorators` |
| Custom composables | `advanced/custom-composables` |
| Vite plugin | `tooling/vite-plugin` |
| DevTools panel | `tooling/devtools` |
| MCP server | `tooling/mcp` |

---

## New project setup

```bash
pnpm create praxisjs@latest
# Choose template: minimal / router / full / blog
```

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

// Props only → StatelessComponent
@Component()
class Badge extends StatelessComponent {
  @Prop() label = ''

  render() {
    return <span class="badge">{this.label}</span>
  }
}
```

### Reactive JSX

```tsx
<p>{() => this.count}</p>   // reactive — updates when count changes
<p>{this.count}</p>         // static — snapshot at render time
```

### Decorator ordering

Field decorators: **inner-first**. `@State()` / `@Prop()` closest to the field.

```ts
@Debug()   // outer
@State()   // inner — runs first ✓
count = 0
```

Class decorators: **bottom-up**. `@Component()` innermost.

```ts
@Scope(container)
@Component()   // innermost — runs first ✓
class MyModule extends StatefulComponent {}
```

### Ecosystem package decorators (fetch the docs page before using — options change)

| Decorator | Package | Use for |
|---|---|---|
| `@Router(routes)` / `@Route(path)` | `@praxisjs/router` | Configure the router on the root component / annotate a page |
| `@Storable()` / `@Store(StoreClass)` | `@praxisjs/store` | Define a singleton store / inject it into a component |
| `@Injectable()` / `@Inject(token)` | `@praxisjs/di` | Mark a service injectable / inject it |
| `@Tween()` / `@Spring()` | `@praxisjs/motion` | Animate a field |
| `@StateMachine()` / `@Transition()` | `@praxisjs/fsm` | Define a finite state machine |
| `@Collection()` / `@PagedCollection()` | `@praxisjs/content` | Markdown content collections |
| `@Head()` | `@praxisjs/head` | Reactive document title/meta |
| `@Styled` / `@Style()` / `@Param()` | `@praxisjs/css` | Typed, scoped CSS classes and reactive CSS custom properties |

---

## AI-oriented development practices

- **Keep AGENTS.md as the single source of architectural truth** — update it after every significant decision.
- **Prefer explicit over implicit** — annotate `@Prop()` fields with explicit types, name stores and composables for what they represent.
- **Write small, focused components** — easier for AI to modify safely.
- **Tests are the spec** — write a test for every `@State` field with side effects and every `@Watch` handler.
- **Never write version numbers** — resolve installs through `praxisjs_get_install_command` or `praxisjs upgrade`.

---

## Hard rules

- Never guess at decorator options — always fetch the docs page.
- Never use workarounds — find the idiomatic path.
- Never skip the AGENTS.md update — the next session depends on it.
- Never use `any` or non-null assertions (`!`) — strict TypeScript throughout.
- Never use `@praxisjs/*/internal` in application code.
- Never write version numbers into `package.json` — resolve installs through `praxisjs_get_install_command` or `npx praxisjs upgrade`.
- If something in the project seems misconfigured, run `npx praxisjs doctor` before guessing at a fix.
