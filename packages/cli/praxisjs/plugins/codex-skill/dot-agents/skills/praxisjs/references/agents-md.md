# AGENTS.md Templates for PraxisJS Projects

`AGENTS.md` is the primary context document for Codex. Every session reads it at startup. Keep it accurate and concise — one page maximum.

---

## Minimal project

```markdown
# [App name]

## Working agreements
- Always consult praxisjs.org docs before writing PraxisJS code — use the praxisjs Codex skill
- Never hardcode version numbers in package.json — install packages via CLI without specifying a version
- Update this file whenever an architectural decision is made

## Stack
- PraxisJS + @praxisjs/core, @praxisjs/decorators, @praxisjs/runtime, @praxisjs/jsx
- Build: Vite [version] + @praxisjs/vite-plugin
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

## Working agreements
- Always consult praxisjs.org docs before writing PraxisJS code — use the praxisjs Codex skill
- Never hardcode version numbers in package.json — install packages via CLI
- Update this file whenever an architectural decision is made

## Stack
- PraxisJS + @praxisjs/core, @praxisjs/decorators, @praxisjs/runtime, @praxisjs/jsx
- @praxisjs/router for client-side routing
- Build: Vite [version] + @praxisjs/vite-plugin

## Architecture
SPA. Entry: `src/main.ts`. Routes configured on the root component with `@Router([...])`.
Pages in `src/pages/`, shared components in `src/components/`.

## Routing conventions
- Each page is a class annotated with `@Route('/path')` or `@Route({ path, name, meta })`
- Lazy-loaded routes use `@Lazy` — fetch `ecosystem/router` docs for details
- Route params via `@Params`, query via `@Query`, current location via `@Location`

## Known constraints
[auth guards, redirect behavior, etc.]
```

---

## With store + DI

```markdown
# [App name]

## Working agreements
- Always consult praxisjs.org docs before writing PraxisJS code — use the praxisjs Codex skill
- Never hardcode version numbers in package.json — install packages via CLI
- Update this file whenever an architectural decision is made

## Stack
- PraxisJS + @praxisjs/core, @praxisjs/decorators, @praxisjs/runtime, @praxisjs/jsx
- @praxisjs/router, @praxisjs/store, @praxisjs/di
- Build: Vite [version] + @praxisjs/vite-plugin

## Architecture
SPA with centralized state. Stores in `src/stores/`, injected with `@Store`.
DI container configured in `src/di.ts`. Pages in `src/pages/`, components in `src/components/`.

## Store conventions
- One store per domain: `UserStore`, `CartStore`, `NotificationsStore`
- Stores are class singletons decorated with `@Storable()`
- Inject via `@Store(UserStore) user!: UserStore`, or resolve imperatively with `store(UserStore)`

## DI conventions
- Services decorated with `@Injectable`
- Injected via `@Inject(ServiceToken) service!: ServiceType`
- Scoped containers via `@Scope` on feature modules

## Known constraints
[auth flow, token storage, etc.]
```

---

## Full (all packages)

```markdown
# [App name]

## Working agreements
- Always consult praxisjs.org docs before writing PraxisJS code — use the praxisjs Codex skill
- Never hardcode version numbers in package.json — install packages via CLI
- Update this file whenever an architectural decision is made

## Stack
- PraxisJS
- Packages: @praxisjs/core, @praxisjs/decorators, @praxisjs/runtime, @praxisjs/jsx,
  @praxisjs/router, @praxisjs/store, @praxisjs/di, @praxisjs/motion, @praxisjs/composables,
  @praxisjs/css
- Build: Vite [version] + @praxisjs/vite-plugin

## Architecture
[Describe the overall structure — feature folders, shared modules, entry points]

## Routing
[Route organization, lazy loading strategy, auth guards]

## State management
[Which stores exist and what they own]

## DI
[Which services are injectable, scoping strategy]

## Styling
[@praxisjs/css / plain / modules / tailwind / unocss — which components use ReactiveStylesheet vs. plain classes]

## Conventions
[Project-specific patterns beyond the defaults]

## Known constraints
[Important limitations, env vars, browser targets]
```

---

## Installing packages

Always resolve `@praxisjs/*` installs through the `praxisjs_get_install_command` MCP tool — never hand-write the command or a version number:

```
praxisjs_get_install_command({ packages: ["@praxisjs/store"] })
praxisjs_get_install_command({ packages: ["@praxisjs/router", "@praxisjs/di"], manager: "pnpm" })
```

```bash
# wrong — version may already be outdated
pnpm add @praxisjs/store@^0.1.0
```

Never add a `@praxisjs/*` entry to `package.json` by hand with a version constraint. To bump existing `@praxisjs/*` dependencies, run `npx praxisjs upgrade` instead of editing ranges manually.

---

## When to update AGENTS.md

Update immediately after:

| Event | What to update |
|---|---|
| Added `@praxisjs/*` package | Stack section |
| Created new store or DI service | Store/DI conventions |
| Added new route pattern | Routing conventions |
| Created base class components share | Conventions section |
| Changed how auth/env/config, or styling, works | Known constraints |
| Renamed a major directory | Architecture section |

## What NOT to put in AGENTS.md

- Implementation details (those belong in the code)
- Change history (that belongs in git)
- TODOs (use issues or a TODO file)
- Per-component documentation
