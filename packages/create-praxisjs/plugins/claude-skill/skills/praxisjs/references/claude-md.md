# CLAUDE.md Templates for PraxisJS Projects

CLAUDE.md is the primary context document for AI-assisted development. Every Claude Code session reads it first. Keep it accurate and concise — one page maximum.

---

## Minimal project

```markdown
# [App name]

## Stack
- PraxisJS 0.x + @praxisjs/core, @praxisjs/decorators, @praxisjs/runtime, @praxisjs/jsx
- Build: Vite 7 + @praxisjs/vite-plugin
- No router, no store

## Architecture
Single-page app. Entry: `src/main.ts` mounts `<App />`. Components live in `src/components/`.

## Conventions
- All components in PascalCase files: `src/components/MyComponent.tsx`
- No global state — all state is local to components

## Known constraints
[e.g. targets Chrome 90+, no IE support]
```

---

## With router

```markdown
# [App name]

## Stack
- PraxisJS 0.x + @praxisjs/core, @praxisjs/decorators, @praxisjs/runtime, @praxisjs/jsx
- @praxisjs/router for client-side routing
- Build: Vite 7 + @praxisjs/vite-plugin

## Architecture
SPA. Entry: `src/main.ts`. Routes configured in `src/router.ts` with `@RouterConfig`.
Pages in `src/pages/`, shared components in `src/components/`.

## Routing conventions
- Each page is a class annotated with `@Route({ path: '...' })`
- Lazy-loaded routes use `@Lazy` — fetch `ecosystem/router` for details
- Route params via `@Params`, query via `@Query`

## Known constraints
[auth guards, redirect behavior, etc.]
```

---

## With store + DI

```markdown
# [App name]

## Stack
- PraxisJS 0.x + @praxisjs/core, @praxisjs/decorators, @praxisjs/runtime, @praxisjs/jsx
- @praxisjs/router, @praxisjs/store, @praxisjs/di
- Build: Vite 7 + @praxisjs/vite-plugin

## Architecture
SPA with centralized state. Stores in `src/stores/`, injected with `@UseStore`.
DI container configured in `src/di.ts`. Pages in `src/pages/`, components in `src/components/`.

## Store conventions
- One store per domain: `UserStore`, `CartStore`, `NotificationsStore`
- Stores are class singletons decorated with `@Store`
- Inject via `@UseStore(UserStore) user!: UserStore`

## DI conventions
- Services decorated with `@Injectable`
- Injected via `@Inject(ServiceToken) service!: ServiceType`
- Scoped containers via `@Scope` on feature modules

## Known constraints
[auth flow, token storage, SSR/SPA decision, etc.]
```

---

## Full (all packages)

```markdown
# [App name]

## Stack
- PraxisJS 0.x
- Packages: @praxisjs/core, @praxisjs/decorators, @praxisjs/runtime, @praxisjs/jsx,
  @praxisjs/router, @praxisjs/store, @praxisjs/di, @praxisjs/motion, @praxisjs/composables
- Build: Vite 7 + @praxisjs/vite-plugin + @praxisjs/devtools (dev only)

## Architecture
[Describe the overall structure — feature folders, shared modules, entry points]

## Routing
[Route organization, lazy loading strategy, auth guards]

## State management
[Which stores exist and what they own]

## DI
[Which services are injectable, scoping strategy]

## Motion
[Which components use @Tween / @Spring and what they animate]

## Composables
[Which @praxisjs/composables are used and where]

## Conventions
[Project-specific patterns beyond the defaults]

## Known constraints
[Important limitations, env vars, browser targets]
```

---

## Installing packages

Always install `@praxisjs/*` packages via the CLI without specifying a version. Let pnpm resolve the latest compatible release:

```bash
# correct
pnpm add @praxisjs/store
pnpm add @praxisjs/router @praxisjs/di

# wrong — version may already be outdated, and it bypasses pnpm's resolution
pnpm add @praxisjs/store@^0.1.0
```

Never add a `@praxisjs/*` entry to `package.json` by hand with a version constraint. The CLI is the source of truth for what version gets installed.

In CLAUDE.md, record the package name only in the Stack section — not the version constraint. The version in `package.json` (set by the CLI) is authoritative.

---

## When to update CLAUDE.md

Update immediately (don't defer) after:

| Event | What to update |
|---|---|
| Added `@praxisjs/*` package | Stack section |
| Created new store or DI service | Store/DI conventions |
| Added new route pattern | Routing conventions |
| Created base class components share | Conventions section |
| Changed how auth/env/config works | Known constraints |
| Renamed a major directory | Architecture section |

## What NOT to put in CLAUDE.md

- Implementation details (those belong in the code)
- Change history (that belongs in git)
- TODOs (use issues or a TODO file)
- Per-component documentation (keep that in tests or inline types)
