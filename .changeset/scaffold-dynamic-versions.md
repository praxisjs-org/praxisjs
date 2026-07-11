---
"create-praxisjs": patch
---

Scaffolded projects now resolve `@praxisjs/*` dependency versions from the npm registry at scaffold time instead of shipping them pinned in the published package. `create-praxisjs` no longer needs a new release just because a `@praxisjs/*` package published a new version.

Templates also moved from a hand-maintained `packages/cli/create-praxisjs/templates/` folder to real, tested workspace apps under `templates/*` (`templates/minimal`, `templates/router`, `templates/full`, `templates/blog`), built with `workspace:*` dependencies and generated into the published package by `scripts/generate-templates.mjs` during `create-praxisjs`'s build step. Since they're regular workspace packages, `pnpm build`/`pnpm typecheck` now catch template code that no longer matches the current framework API.

Scaffolded projects now use `useDefineForClassFields: true` in `tsconfig.json` (previously `false`), matching the Vite 8 / oxc requirement (see the `@praxisjs/vite-plugin` changelog). The old `false` default silently broke every decorator (`@State`, `@Prop`, etc.) once the scaffolded app's `@praxisjs/vite-plugin` was upgraded to the Vite 8 line.

Bumped the `tsdown` build dependency from `0.20.3` to `0.22.4` — the older version's `typescript` peer range (`^5.0.0`) didn't include this repo's `typescript@6.0.3`, so `pnpm install` reported an unmet peer dependency. No change to the published output.
