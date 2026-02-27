# Verbose

> **⚠️ Experimental** — Verbose is in early beta. The API is unstable and subject to breaking changes without notice. Not recommended for production use.

A signal-driven frontend framework written in TypeScript. Verbose combines fine-grained reactivity with class components and decorators, shipping a complete first-party ecosystem for building web applications.

**[Documentation](https://your-docs-url.com)** · [GitHub](https://github.com/MateusGX/verbose)

## Packages

### Foundation

| Package               | Description                                                                  |
| --------------------- | ---------------------------------------------------------------------------- |
| `@verbose/core`       | Signals, computed values, effects, and async resources                       |
| `@verbose/decorators` | Class component decorators (`@Component`, `@State`, `@Prop`, `@Watch`, etc.) |
| `@verbose/jsx`        | JSX runtime                                                                  |
| `@verbose/runtime`    | Rendering engine                                                             |
| `@verbose/shared`     | Shared types and utilities                                                   |

### Features

| Package           | Description                |
| ----------------- | -------------------------- |
| `@verbose/router` | Client-side router         |
| `@verbose/store`  | State management           |
| `@verbose/motion` | Animations and transitions |
| `@verbose/di`     | Dependency injection       |
| `@verbose/fsm`    | Finite state machines      |

### Utils

| Package                | Description           |
| ---------------------- | --------------------- |
| `@verbose/composables` | Composition utilities |
| `@verbose/concurrent`  | Concurrency control   |

### DX

| Package                | Description      |
| ---------------------- | ---------------- |
| `@verbose/vite-plugin` | Vite integration |

## Development

This is a monorepo managed with [pnpm workspaces](https://pnpm.io/workspaces).

```sh
pnpm install

# build all packages
pnpm build

# build by layer
pnpm build:foundation
pnpm build:features
pnpm build:utils
pnpm build:dx

# run docs
pnpm docs:dev

# typecheck
pnpm typecheck

# lint
pnpm lint
```

## Contributing

Verbose is a personal project, built out of curiosity and a desire to explore framework design from the ground up. Contributions are welcome — whether it's bug reports, ideas, or pull requests. Feel free to open an issue to discuss anything before diving in.

## License

[MIT](./LICENSE)
