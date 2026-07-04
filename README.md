<div align="center">

<img src="assets/logo.svg" width="72" height="72" alt="PraxisJS" />

# PraxisJS

**Signal-driven TypeScript frontend framework.**

Fine-grained reactivity · Decorator-first class components · Complete ecosystem

[![version](https://img.shields.io/npm/v/@praxisjs/core?label=%40praxisjs%2Fcore&color=38bdf8)](https://www.npmjs.com/package/@praxisjs/core)
[![coverage](https://codecov.io/gh/praxisjs-org/praxisjs/graph/badge.svg?token=VTZHTEP9QT)](https://codecov.io/gh/praxisjs-org/praxisjs)
[![license](https://img.shields.io/github/license/praxisjs-org/praxisjs?color=38bdf8)](./LICENSE)

[Docs](https://praxisjs.org) · [Getting Started](https://praxisjs.org/docs/guide/getting-started) · [Changelog](https://praxisjs.org/docs/changelog)

</div>

---

PraxisJS is a TypeScript frontend framework built around a fine-grained signal engine. Components are plain classes decorated with a rich built-in decorator set — no hooks, no magic strings, no virtual DOM. The first-party ecosystem covers routing, global state, animations, dependency injection, finite state machines, async data, and more.

## Quick look

```tsx
import { Component, State, Watch, Resource } from '@praxisjs/decorators'
import type { ResourceInstance } from '@praxisjs/decorators'
import { StatefulComponent } from '@praxisjs/core'

interface Post { id: number; title: string }

@Component()
class BlogPage extends StatefulComponent {
  @State() page = 1

  @Resource((self: BlogPage) =>
    fetch(`/api/posts?page=${self.page}`).then(r => r.json() as Promise<Post[]>)
  )
  posts!: ResourceInstance<Post[]>

  @Watch('page')
  onPageChange(next: number) {
    window.scrollTo(0, 0)
  }

  render() {
    return (
      <div>
        {() => this.posts.pending() && <p>Loading…</p>}
        {() => this.posts.data()?.map(p => <h2>{p.title}</h2>)}
        <button onClick={() => this.page++}>Next page</button>
      </div>
    )
  }
}
```

Changing `this.page` automatically cancels the previous request and starts a new one — no `useEffect`, no manual cleanup.

## Packages

### Foundation

| Package | Version | Description |
|---|---|---|
| [`@praxisjs/core`](packages/foundation/core) | `1.7.0` | Signal engine — `signal`, `computed`, `effect`, `batch`, `resource` |
| [`@praxisjs/decorators`](packages/foundation/decorators) | `1.1.0` | Class component decorators — `@State`, `@Prop`, `@Watch`, `@Emit`, `@Resource`, `@Memo`, … |
| [`@praxisjs/runtime`](packages/foundation/runtime) | `0.3.0` | DOM renderer, scope system, `Portal` |
| [`@praxisjs/jsx`](packages/foundation/jsx) | `0.5.0` | JSX runtime (`jsx-runtime`, `jsx-dev-runtime`) |
| [`@praxisjs/shared`](packages/foundation/shared) | `0.2.0` | Shared types and internal utilities |

```sh
npm install @praxisjs/core @praxisjs/decorators @praxisjs/runtime @praxisjs/jsx
```

### Features

| Package | Version | Description |
|---|---|---|
| [`@praxisjs/router`](packages/features/router) | `1.2.0` | Client-side router — `@Router`, `@Route`, `@Lazy`, layouts, navigation guards |
| [`@praxisjs/store`](packages/features/store) | `1.2.0` | Global reactive state — `@Storable`, `@Store` |
| [`@praxisjs/di`](packages/features/di) | `1.3.0` | Dependency injection — `Container`, `@Inject`, `@Injectable` |
| [`@praxisjs/motion`](packages/features/motion) | `1.1.11` | Animations — `@Tween`, `@Spring` |
| [`@praxisjs/fsm`](packages/features/fsm) | `2.0.0` | Finite state machines — `@StateMachine`, `@Transition` |
| [`@praxisjs/head`](packages/features/head) | `0.2.0` | Reactive document head — `@Head` for title, meta, og:*, twitter:* |
| [`@praxisjs/content`](packages/features/content) | `0.1.0` | Markdown content collections — `@Collection`, `@PagedCollection` |

### Utilities

| Package | Version | Description |
|---|---|---|
| [`@praxisjs/composables`](packages/utils/composables) | `1.1.2` | Class-based composables — `WindowSize`, `ScrollPosition`, `Focus`, … |
| [`@praxisjs/concurrent`](packages/utils/concurrent) | `1.2.9` | Async concurrency — `@Task`, `@Queue`, `@Pool` |

### DX

| Package | Version | Description |
|---|---|---|
| [`@praxisjs/vite-plugin`](packages/dx/vite-plugin) | `0.1.1` | Vite integration — JSX transform, decorator support, HMR |
| [`@praxisjs/devtools`](packages/dx/devtools) | `0.2.19` | In-app signal inspector and component profiler |
| [`@praxisjs/storybook`](packages/dx/storybook) | `0.1.1` | Storybook framework adapter |
| [`@praxisjs/mcp`](packages/dx/mcp) | `0.1.0` | MCP server for AI assistant integration |

### CLI

| Package | Version | Description |
|---|---|---|
| [`create-praxisjs`](packages/cli/create-praxisjs) | `0.4.2` | Project scaffolding CLI |
| [`praxisjs`](packages/cli/praxisjs) | `0.1.0` | Maintenance CLI for existing projects (`praxisjs add`) |

```sh
npm create praxisjs@latest
npx praxisjs add
```

## Monorepo layout

```
packages/
  foundation/   core · shared · decorators · jsx · runtime
  features/     router · store · di · motion · fsm · head · content
  utils/        composables · concurrent
  dx/           vite-plugin · devtools · storybook · mcp
  cli/          create-praxisjs · praxisjs
playground/     manual testing app (Vite)
docs/           documentation site (Next.js + Fumadocs)
```

## Development

Requires [pnpm](https://pnpm.io).

```sh
pnpm install

# build everything (required before first run)
pnpm build

# build by layer
pnpm build:foundation
pnpm build:features
pnpm build:utils
pnpm build:dx

# watch mode — rebuild all packages on change
pnpm dev

# playground (hot-reload manual test app)
pnpm --filter playground dev

# tests
pnpm test
pnpm test:watch
pnpm test:coverage

# lint + typecheck
pnpm lint
pnpm lint:fix
pnpm typecheck

# docs dev server
pnpm docs:dev
```

> After editing a package's source, rebuild it before dependent packages pick up the change:
> `pnpm --filter @praxisjs/core build`

## Releases

Changesets — pick affected packages, bump type, and summary:

```sh
pnpm changeset          # interactive — create a changeset
pnpm version-packages   # bump versions + sync create-praxisjs templates
pnpm release            # publish to npm
```

## Contributing

PraxisJS is a personal project built out of curiosity and a desire to explore framework design from scratch. Contributions are welcome — bug reports, ideas, and pull requests. Opening an issue before a large change is appreciated.

## License

[MIT](./LICENSE)
