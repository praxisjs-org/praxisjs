# create-verbose

The fastest way to start a new Verbose project. `create-verbose` is an interactive CLI that scaffolds a fully configured project — TypeScript, Vite, JSX, and the packages you need — with no manual setup.

::: warning Experimental
Verbose is under active development. APIs are unstable and subject to breaking changes at any time. Not recommended for production use. [See project status →](/project-status)
:::

## Usage

::: code-group

```sh [npm]
npm create verbose@latest
```

```sh [pnpm]
pnpm create verbose
```

```sh [yarn]
yarn create verbose
```

```sh [bun]
bun create verbose
```

:::

You can also pass the project name directly:

```sh
npm create verbose@latest my-app
```

## Interactive prompts

The CLI will guide you through two steps:

**1. Project name** — the directory to create and the `name` field in `package.json`.

**2. Template selection** — choose the starting point that fits your needs:

| Template | Includes |
| -------- | -------- |
| Minimal | `@verbose/core`, `@verbose/decorators`, `@verbose/jsx`, `@verbose/runtime` |
| With Router | Minimal + `@verbose/router` |
| Full | Router + `@verbose/store`, `@verbose/di`, `@verbose/composables`, `@verbose/concurrent`, `@verbose/devtools` |

## Templates

### Minimal

A counter app demonstrating signals and class components. The right starting point when you want to explore the framework without extra opinions about routing or state management.

```
my-app/
├── src/
│   ├── app.tsx
│   └── main.tsx
├── index.html
├── tsconfig.json
└── vite.config.ts
```

### With Router

Extends Minimal with client-side routing pre-configured. Includes a two-page layout (Home and About) with a `<Link>`-based navigation bar and `<RouterView />`.

```
my-app/
├── src/
│   ├── pages/
│   │   ├── home.tsx
│   │   └── about.tsx
│   ├── app.tsx
│   └── main.tsx
├── index.html
├── tsconfig.json
└── vite.config.ts
```

### Full

Everything in Router plus centralized state management, dependency injection, async utilities, and DevTools. Suited for larger applications that need a structured architecture from the start.

```
my-app/
├── src/
│   ├── pages/
│   │   ├── home.tsx
│   │   └── about.tsx
│   ├── services/
│   │   └── api.ts
│   ├── app.tsx
│   ├── main.tsx
│   └── store.ts
├── index.html
├── tsconfig.json
└── vite.config.ts
```

## Next steps

After scaffolding, follow the printed instructions:

```sh
cd my-app
npm install
npm run dev
```

The dev server starts at `http://localhost:5173` with HMR enabled via `@verbose/vite-plugin`.

---

Prefer to set up manually? See [Getting Started](/guide/getting-started) for step-by-step instructions.
