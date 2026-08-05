# AGENTS.md Templates for PraxisJS Projects

`AGENTS.md` is the primary context document for Codex. Every session reads it at startup. Keep it accurate and concise — one page maximum.

The **Working agreements** block belongs at the top of every variant below:

```markdown
## Working agreements
- Always consult praxisjs.org docs before writing PraxisJS code — use the praxisjs Codex skill
- Before hand-rolling any behavior, check the docs for a native PraxisJS decorator, composable, or package export that already does it
- Never hardcode version numbers in package.json — install packages via CLI without specifying a version
- Update this file whenever an architectural decision is made
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
- All components in PascalCase files: `src/components/MyComponent.tsx`
- No global state — all state is local to components
- Presentational components extend `StatelessComponent<Props>`; anything with `@State`, `@Watch`, or `@Emit` extends `StatefulComponent`

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

## Store conventions
- One store per domain: `UserStore`, `CartStore`, `NotificationsStore`
- Stores are class singletons: `@Storable() class UserStore extends ReactiveStore`, reactive fields declared with `@State()`
- Inject via `@Store(UserStore) user!: UserStore`, or resolve imperatively with `store(UserStore)`

## DI conventions
- Services decorated with `@Injectable`
- Injected via `@Inject(ServiceToken) service!: ServiceType`
- Scoped containers via `@Scope` on feature modules

## Known constraints
[auth flow, token storage, SSG decision, etc.]
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

In `AGENTS.md`, record the package name only in the Stack section — not the version constraint. The version in `package.json` is authoritative.

---

## When to update AGENTS.md

Update immediately after:

| Event | What to update |
|---|---|
| Added `@praxisjs/*` package | Stack section |
| Created new store or DI service | Store/DI conventions |
| Added new route pattern | Routing conventions |
| Created base class components share | Conventions section |
| Wrote custom logic because the docs confirmed no native API covers it | Conventions section — say what you built and why nothing built-in fit |
| Added a shared stylesheet class or composable | Styling / Composables section |
| Enabled or reconfigured `@praxisjs/ssg` | Prerendering section |
| Changed how auth/env/config, or styling, works | Known constraints |
| Renamed a major directory | Architecture section |

## What NOT to put in AGENTS.md

- Implementation details (those belong in the code)
- Change history (that belongs in git)
- TODOs (use issues or a TODO file)
- Per-component documentation
