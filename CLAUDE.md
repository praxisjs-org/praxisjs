# PraxisJS — Agent Guide

Signal-driven TypeScript frontend framework. Monorepo managed with pnpm workspaces and changesets.

---

## Package map

### Foundation (framework core)

| Package                | Role                                                                                       |
| ---------------------- | ------------------------------------------------------------------------------------------ |
| `@praxisjs/core`       | Reactivity engine — `signal`, `computed`, `effect`, `peek`, `untrack`, `batch`, `resource` |
| `@praxisjs/shared`     | Shared types and internal utilities used across packages                                   |
| `@praxisjs/decorators` | Class component decorators — `@State`, `@Prop`, `@Computed`, `@Watch`, `@Emit`, etc.       |
| `@praxisjs/jsx`        | JSX runtime (`jsx-runtime`, `jsx-dev-runtime`)                                             |
| `@praxisjs/runtime`    | DOM renderer — mounts components, manages scopes, handles reactive children                |

### Features (first-party plugins)

| Package            | Role                                       |
| ------------------ | ------------------------------------------ |
| `@praxisjs/router` | Client-side router with `@Route` decorator |
| `@praxisjs/store`  | Global state management                    |
| `@praxisjs/motion` | Animation and transitions                  |
| `@praxisjs/di`     | Dependency injection                       |
| `@praxisjs/fsm`    | Finite state machine                       |

### Utils

| Package                 | Role                                                          |
| ----------------------- | ------------------------------------------------------------- |
| `@praxisjs/composables` | DOM, browser, and concurrency composables                     |
| `@praxisjs/concurrent`  | `@Task`, `@Queue`, `@Pool` field decorators for async control |

### DX

| Package                 | Role                                          |
| ----------------------- | --------------------------------------------- |
| `@praxisjs/devtools`    | In-app devtools overlay (Vite + UnoCSS build) |
| `@praxisjs/vite-plugin` | Vite plugin (`praxisjs({ hmr: true })`)       |
| `create-praxisjs`       | CLI scaffolding tool (tsdown build)           |

### Private

| Package          | Role                            |
| ---------------- | ------------------------------- |
| `playground`     | Vite dev app for manual testing |
| `@praxisjs/docs` | VitePress documentation site    |

---

## Workspace layout

```
packages/
  foundation/   core  shared  decorators  jsx  runtime
  features/     router  store  motion  di  fsm
  utils/        composables  concurrent
  dx/           devtools  vite-plugin
  create-praxisjs/
playground/
docs/
```

---

## Commands

```bash
# Development
pnpm dev                        # watch-build all packages in parallel
pnpm --filter @praxisjs/core dev

# Build
pnpm build                      # build all packages
pnpm build:foundation           # foundation packages only
pnpm --filter @praxisjs/runtime build

# Playground
cd playground && pnpm dev       # or from root: pnpm --filter playground dev

# Tests
pnpm test                       # vitest run (all packages)
pnpm test:watch
pnpm test:coverage

# Lint
pnpm lint
pnpm lint:fix

# Docs
pnpm docs:dev
pnpm docs:build
```

---

## Build system

- **Foundation / Features / Utils**: `tsc` — each package has its own `tsconfig.json` extending `tsconfig.base.json`. Output goes to `dist/`.
- **Devtools**: `vite build` with `vite-plugin-dts`.
- **create-praxisjs**: `tsdown`.
- **No TypeScript project references** — packages are built independently.

After editing a package's source, rebuild it before dependent packages pick up changes:

```bash
pnpm --filter @praxisjs/core build
```

---

## Reactivity model

`render()` always runs **untracked** (`activeEffect = null`). Reactive DOM bindings are created only via arrow functions in JSX:

```tsx
render() {
  return (
    <div>
      <p>{() => this.count}</p>      // reactive — subscribes to count
      <p>{this.count}</p>            // static — snapshot at render time, safe to use
    </div>
  )
}
```

Reading a signal outside an arrow function during render is intentionally safe — it returns the current value without creating any subscription. This is guaranteed by `untrack` wrapping the entire `mountComponent` call.

Use `peek(signal)` or `untrack(fn)` (exported from `@praxisjs/core`) when you need to read a signal inside a reactive context (e.g. inside a `@Watch` or `computed`) without subscribing to it.

---

## Decorator ordering

Field decorators run **inner-first**. Always put `@State()` / `@Prop()` closer to the field than observing decorators:

```ts
// ✅ correct — @State runs first, @Debug wraps it
@Debug()
@State()
count = 0

// ❌ wrong — @Debug sees no existing descriptor
@State()
@Debug()
count = 0
```

`createFieldDecorator` uses `context.addInitializer`, so initialization happens during `new ctor(...)` in the order decorators were registered.

Class decorators also apply **bottom-up**. When stacking `@Scope` with `@Component`, `@Component` must be innermost so it runs first:

```ts
// ✅ correct
@Scope(...)
@Component()
class MyModule extends StatefulComponent { /* ... */ }
```

---

## Building decorators

### Field decorators — `createFieldDecorator`

Use for property-level behavior. The `bind` callback runs once per instance during construction.

```ts
import { createFieldDecorator, type FieldBinding } from '@praxisjs/decorators'

function MyDecorator() {
  return createFieldDecorator({
    bind(instance, name, initialValue): FieldBinding {
      return {
        descriptor: {
          get(this: object) { /* ... */ },
          set(this: object, v: unknown) { /* ... */ },
        },
        onMount() { /* ... */ },
        onUnmount() { /* ... */ },
      }
    },
  })
}
```

### Class decorators — `createClassDecorator` / `ClassBehavior`

Use for class-level behavior. Extend `ClassBehavior` and implement its two hooks:

| Hook | When it runs | Use for |
|---|---|---|
| `create(instance)` | Once per instance, in the constructor | Per-instance setup (state, side-effects) |
| `initialize(Enhanced, original)` | Once after the class is decorated | Static setup — registrations, metadata on the constructor |

```ts
import { createClassDecorator, ClassBehavior, type ClassEnhancement } from '@praxisjs/decorators'
import type { RootComponent } from '@praxisjs/core/internal'

class MyBehavior extends ClassBehavior {
  create(instance: RootComponent): ClassEnhancement {
    // runs per instance
    return {
      onMount() { /* ... */ },
      onUnmount() { /* ... */ },
    }
  }

  initialize(Enhanced: new (...args: unknown[]) => unknown, _original: new (...args: unknown[]) => unknown): void {
    // runs once — set static properties on Enhanced
  }
}

export function MyDecorator() {
  return createClassDecorator(new MyBehavior())
}
```

`createClassDecorator` wraps the class in an `Enhanced` subclass. The original class name is preserved via `Object.defineProperty`. Decorators built this way must be used as real decorators (not called imperatively with the return value discarded) so TypeScript reassigns the class variable to `Enhanced`.

---

## Internal imports

`@praxisjs/core` and `@praxisjs/shared` each expose a `/internal` sub-path for types and utilities that are meant for other framework packages but not for end users:

```ts
import type { RootComponent } from '@praxisjs/core/internal'   // framework-internal base class
import type { ComponentConstructor } from '@praxisjs/shared/internal'
```

Use the public path (`@praxisjs/core`) in application code and in packages that ship to users. Use `/internal` only inside `packages/foundation/**` or `packages/features/**` when implementing framework primitives that need access to the base class or internal types.

---

## Changesets

Changesets live in `.changeset/`. Use them for any public package change:

```bash
pnpm changeset        # interactive — pick packages and bump type
pnpm version-packages # bump versions + sync create-praxisjs templates
pnpm release          # publish to npm
```

Bump types:

- **patch** — bugfixes, internal refactors with no API change
- **minor** — new exports, new decorator options, backwards-compatible features
- **major** — breaking API changes

`create-praxisjs` always gets a **patch** bump when its template dependencies change — this is handled by `scripts/sync-template-versions.mjs` and does not require a manual changeset.

**Never edit `CHANGELOG.md` files inside packages.** These files (`packages/**/CHANGELOG.md`) are generated automatically by `changeset version` when the release workflow runs in GitHub Actions. Editing them manually will cause conflicts and be overwritten on the next release. The only changelog files you should ever write are the docs changelog pages under `docs/content/docs/changelog/`.

### Docs review before creating a changeset

Before opening a changeset for any package, review the relevant docs pages and update them as part of the same PR:

- **New API / export** — add it to the appropriate docs page (description, usage example, options table). Also add an entry to the package's changelog page under `docs/content/docs/changelog/`.
- **Changed API** — update every docs page that references the old behavior. Mark removed options or signatures clearly.
- **Removed API** — delete or strike through the docs section; note the removal in the changelog page.
- **Bug fix** — add a changelog entry; update any docs that described the broken behavior as intentional.

Do not consider a changeset complete until the docs reflect the current state of the package. If no docs page exists yet for an affected area, create one following the structure in the [Documentation](#documentation) section.

**Always update `docs/content/docs/packages.mdx`** with the new version for every package that receives a changeset. Derive the next version from the current `package.json` version and the bump type (patch/minor/major). This is required — a changeset is not complete without it.

**Never edit `version` in `package.json` files.** Package versions are managed exclusively by `pnpm changeset version`. Manual edits will be overwritten by the release workflow and break the automated process.

---

## Testing

Tests live in `packages/**/src/__tests__/**/*.test.ts`. Vitest uses path aliases so cross-package imports resolve to source files without building first.

The default environment is `node`. Tests that need DOM APIs (localStorage, `document`, etc.) opt in per-file with an inline docblock:

```ts
// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
```

**Tests are required for every package you create or edit.** This applies to all packages without exception:

- **New package** — create `src/__tests__/` and write tests for every exported function and behavior before the package is considered done.
- **Edited package** — validate existing tests still pass and add new tests for any changed or added behavior.
- New signals, utilities, or primitives in `@praxisjs/core`
- New decorators or changes to existing ones in `@praxisjs/decorators`
- New runtime behavior (mounting, reactivity, scopes) in `@praxisjs/runtime`
- Bug fixes — the test must reproduce the bug before the fix and pass after
- New composables or concurrency utilities
- New DX packages (`packages/dx/**`) — mock external dependencies (MCP SDK, Vite, Storybook, etc.) with `vi.mock` / `vi.stubGlobal` and test the exported logic directly

Do not open a changeset or consider a task done without corresponding tests. If a package has no `__tests__` directory yet, create it.

---

## Change checklist

Every code change — whether creating, updating, or removing something — is only complete when **all** of the following are done. Work through this list in order before considering a task finished:

- [ ] **Implementation** — source files in `packages/**/src/` reflect the intended behavior
- [ ] **Tests** — `packages/**/src/__tests__/` has add/updated/removed cases covering the change; `pnpm test` passes
- [ ] **Docs page** — if the change affects public API or behavior, update the relevant `docs/content/docs/**/*.mdx` page:
  - New export → description + usage example added
  - Changed behavior → existing section updated
  - Removed API → section deleted or struck through
  - Internal-only changes (e.g. refactor with no observable difference) → no docs update needed
- [ ] **Changelog page** — `docs/content/docs/changelog/<package>.mdx` has a new entry at the top with the next version number and a plain-English summary of what changed
- [ ] **Story** — if the change is user-facing (new component, new decorator option, new API surface), add or update a story in `storybook/stories/`. Example: a new `@Throttle()` decorator warrants a story showing throttled vs. unthrottled behavior; an internal scheduler fix does not. **One story (`StoryObj`) per file** — create a new `.stories.tsx` file for each distinct story rather than adding multiple named exports to an existing one. **Group by subject in a folder** — when a package or feature has more than one story file, place all of them inside a dedicated subfolder (e.g. `storybook/stories/ecosystem/content/`, `storybook/stories/ecosystem/router/`). A lone story for a package may live directly in the parent folder; move it into a subfolder as soon as a second story is added.
- [ ] **Changeset** — `.changeset/<slug>.md` created with the correct bump type (`patch` / `minor` / `major`) and a concise summary

The docs and story items are required when the change is user-facing. For purely internal changes (refactors, test fixes, type-only adjustments with no API impact) they may be skipped — but when in doubt, update them.

---

## Linting

ESLint with typescript-eslint strict rules. Key constraints:

- `import type` / `export type` required for type-only imports
- Import order: builtins → externals → `@praxisjs/*` → relative → types
- No `any`, no non-null assertions (`!`), no floating promises
- Filenames must be kebab-case

Linting runs on staged `packages/**/*.{ts,tsx}` files via Husky pre-commit hook.

---

## Documentation

Docs source: `docs/content/docs/`. Built with [Fumadocs](https://fumadocs.vercel.app) + Next.js (`output: export`). Structure:

```
guide/          introduction  getting-started  project-status
essentials/     components  reactivity  jsx  lifecycle  async-data
decorators/     state  watchers  events  performance  timing  utilities  dx
ecosystem/      router  store  di  motion  fsm
composables/    dom  browser  concurrency
tooling/        vite-plugin  devtools
changelog/      core  decorators  runtime  router  store  …
```

Every page needs `description:` frontmatter. Pages use standard MDX with Fumadocs components (`<Callout>`, `<Cards>`, `<Card>`, etc.). Run `pnpm docs:dev` to preview. Static output goes to `docs/out/`.
