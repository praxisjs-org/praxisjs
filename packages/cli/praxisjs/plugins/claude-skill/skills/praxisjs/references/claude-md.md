# CLAUDE.md Templates for PraxisJS Projects

CLAUDE.md is the primary context document for AI-assisted development. Every Claude Code session reads it first. Keep it accurate and concise — one page maximum.

It holds the stack, the entry points and the constraints. Everything that grows with the code —
reusable components and utilities, business rules, architecture decisions, conventions, the glossary —
lives in the project memory (`.praxis/`), read and changed only through the PraxisJS MCP server's
`praxisjs_memory_*` tools (`project-memory.md`). Don't copy memory entries into CLAUDE.md.

The **Working agreements** and **Project memory** blocks belong in every variant below:

```markdown
## Working agreements
- Look up every PraxisJS API in the docs through the PraxisJS MCP server before writing code — never guess
- Before writing a component, composable, store, service, decorator or helper, run praxisjs_memory_check_duplicate and reuse what exists
- Extend PraxisJS with its decorator builders, Composable, store plugins and devtools plugins; never the `accessor` keyword
- Build UI from installed Kosmesis components, the Kosmesis registry (`npx kosmesis add`) and Morphos primitives before writing new ones
- Put files where conventions/project-structure says (praxisjs_scaffold); move misplaced code you touch
- Never hardcode version numbers in package.json — install packages via praxisjs_get_install_command or `praxisjs upgrade`
- Validate changed files with praxisjs_validate_file

## Project memory
Reusable code, business rules, decisions and conventions are in `.praxis/`, read and changed only
through the PraxisJS MCP server (`praxisjs_memory_*` tools). Never edit those files by hand.
```

---

## Minimal project

```markdown
# [App name]

## Working agreements
[block above]

## Stack
- PraxisJS + @praxisjs/core, @praxisjs/decorators, @praxisjs/runtime, @praxisjs/jsx
- Build: Vite [version] + @praxisjs/vite-plugin
- No router, no store

## Architecture
Single-page app. Entry: `src/main.tsx` calls `render(() => <App />, …)`. Components live in `src/components/`.

## Conventions
- No global state — all state is local to components
- Folder layout and naming: `conventions/project-structure` in the project memory

## Project memory
[block above]

## Known constraints
[e.g. targets Chrome 90+, no IE support]
```

---

## With router

```markdown
# [App name]

## Working agreements
[block above]

## Stack
- PraxisJS + @praxisjs/core, @praxisjs/decorators, @praxisjs/runtime, @praxisjs/jsx
- @praxisjs/router for client-side routing
- Build: Vite [version] + @praxisjs/vite-plugin

## Architecture
SPA. Entry: `src/main.tsx`. Routes configured on the root component with `@Router([...])`.
Pages in `src/pages/`, shared components in `src/components/`.

## Project memory
[block above]

## Routing conventions
- Each page is a class annotated with `@Route('/path')` or `@Route({ path, name, meta })`
- Lazy routes use `Lazy(() => import('./pages/x'))` from `@praxisjs/router` — not the `@Lazy` decorator from `@praxisjs/decorators`, which is the viewport-deferred-mount decorator
- Route params via `@Params`, query via `@Query`, current location via `@Location`, route meta via `@Meta` / `useMeta`
- Navigation UI uses `<Link to="…">`; the matched page renders into `<RouterView />`

## Known constraints
[auth guards, redirect behavior, etc.]
```

---

## With store + DI

```markdown
# [App name]

## Working agreements
[block above]

## Stack
- PraxisJS + @praxisjs/core, @praxisjs/decorators, @praxisjs/runtime, @praxisjs/jsx
- @praxisjs/router, @praxisjs/store, @praxisjs/di
- Build: Vite [version] + @praxisjs/vite-plugin

## Architecture
SPA with centralized state. Stores in `src/stores/`, injected with `@Store`.
DI container configured in `src/di.ts`. Pages in `src/pages/`, components in `src/components/`.

## Project memory
[block above]

## Store conventions
- One store per domain: `UserStore`, `CartStore`, `NotificationsStore`
- Stores are class singletons: `@Storable() class UserStore extends ReactiveStore`, reactive fields declared with `@State()`
- Inject via `@Store(UserStore) user!: UserStore`, or resolve imperatively with `store(UserStore)`

## DI conventions
- Services decorated with `@Injectable`
- Injected via `@Inject(ServiceToken) service!: ServiceType`
- Scoped containers via `@Scope` on feature modules

## Known constraints
[auth flow, token storage, SSR/SSG decision, etc.]
```

---

## Content / blog site

```markdown
# [App name]

## Working agreements
[block above]

## Stack
- PraxisJS + @praxisjs/core, @praxisjs/decorators, @praxisjs/runtime, @praxisjs/jsx
- @praxisjs/router, @praxisjs/content, @praxisjs/head
- Build: Vite [version] + @praxisjs/vite-plugin
- Prerendering: [@praxisjs/ssg / none]

## Architecture
Markdown-backed site. Posts in `src/content/posts/*.md`, collection defined in `src/content/posts.ts`.
Pages in `src/pages/`, entry `src/main.tsx`.

## Project memory
[block above]

## Content conventions
- Frontmatter shape is a class extending `ContentSchema`, wired with `@Collection` / `@PagedCollection`
- Entries are read with `getCollection` / `getEntry`; paginated lists with `getPage` / `getTotal`
- Per-page title and meta tags come from `@Head`

## Prerendering
[If @praxisjs/ssg is used: `ssgPlugin({ root: './src/app.tsx' })` in vite.config.ts.
`src/app.tsx` default-exports the root component and named-exports the same `routes` array
passed to `@Router([...])`. Dynamic routes expand via `getStaticPaths` on the route entry —
`collectionStaticPaths` from @praxisjs/content covers the common content case.]

## Known constraints
[deploy target, base path, feed generation, etc.]
```

---

## Full (all packages)

```markdown
# [App name]

## Working agreements
[block above]

## Stack
- PraxisJS
- Packages: @praxisjs/core, @praxisjs/decorators, @praxisjs/runtime, @praxisjs/jsx,
  @praxisjs/router, @praxisjs/store, @praxisjs/di, @praxisjs/motion, @praxisjs/composables,
  @praxisjs/concurrent, @praxisjs/head, @praxisjs/css
- Build: Vite [version] + @praxisjs/vite-plugin (+ praxisjsCSS() for static CSS extraction)
  + @praxisjs/devtools (dev only)

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

## Styling
[@praxisjs/css / plain / modules / tailwind / unocss — which components use ReactiveStylesheet
vs. plain Stylesheet vs. plain classes]

## Composables
[Which @praxisjs/composables classes are attached via @Compose and where]

## Async & concurrency
[Which endpoints go through @Resource, which flows use @Task / @Queue / @Pool]

## Project memory
[block above]

## Known constraints
[Important limitations, env vars, browser targets]
```

---

## Installing packages

Always resolve `@praxisjs/*` installs through the `praxisjs_get_install_command` MCP tool — never hand-write the command or a version number:

```
praxisjs_get_install_command({ packages: ["@praxisjs/store"], dev: false })
praxisjs_get_install_command({ packages: ["@praxisjs/router", "@praxisjs/di"], manager: "pnpm", dev: false })
praxisjs_get_install_command({ packages: ["@praxisjs/ssg"], manager: "pnpm" })
```

`dev` defaults to `true`: pass `dev: false` for packages the app imports at runtime, keep the default for build tooling.

The tool returns the correct command for the project's package manager with no version constraint, so the package manager always resolves the latest compatible release.

```bash
# wrong — version may already be outdated, and it bypasses the package manager's resolution
pnpm add @praxisjs/store@^0.1.0
```

Never add a `@praxisjs/*` entry to `package.json` by hand with a version constraint. To bump existing `@praxisjs/*` dependencies to their latest version, run `npx praxisjs upgrade` instead of editing ranges manually.

In CLAUDE.md, record the package name only in the Stack section — not the version constraint. The version in `package.json` (set by the CLI) is authoritative.

---

## When to update CLAUDE.md, and when the project memory

| Event | Update |
|---|---|
| Added or removed a `@praxisjs/*` package | CLAUDE.md, Stack section |
| Changed entry points, build, env vars, browser targets, deploy | CLAUDE.md |
| Enabled or reconfigured `@praxisjs/ssg` | CLAUDE.md, Prerendering section |
| Created a reusable component, composable, store, service, decorator or helper | project memory: `praxisjs_memory_add` (`components` / `utilities`) |
| Wrote custom logic because nothing built-in fit | project memory entry, with why nothing existing fit |
| Changed or moved reusable code | project memory: `praxisjs_memory_update` (`praxisjs_memory_map` finds stale entries) |
| A business rule came up | project memory: `business-rules` |
| An architecture choice was made (state management, routing strategy, styling) | project memory: `architecture` |
| A folder layout or coding convention was agreed | project memory: `conventions` (`project-structure` for folders) |

Update immediately; don't defer.

## What NOT to put in CLAUDE.md

- Anything the project memory holds (component catalog, rules, decisions, conventions)
- Implementation details (those belong in the code)
- Change history (that belongs in git)
- TODOs (use issues or a TODO file)
