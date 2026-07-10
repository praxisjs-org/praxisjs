---
"create-praxisjs": patch
---

Scaffolded projects now resolve `@praxisjs/*` dependency versions from the npm registry at scaffold time instead of shipping them pinned in the published package. `create-praxisjs` no longer needs a new release just because a `@praxisjs/*` package published a new version.

Templates also moved from a hand-maintained `packages/cli/create-praxisjs/templates/` folder to real, tested workspace apps under `templates/*` (`templates/minimal`, `templates/router`, `templates/full`, `templates/blog`), built with `workspace:*` dependencies and generated into the published package by `scripts/generate-templates.mjs` during `create-praxisjs`'s build step. Since they're regular workspace packages, `pnpm build`/`pnpm typecheck` now catch template code that no longer matches the current framework API.
