---
"@praxisjs/mcp": patch
---

Bumped the `tsdown` build dependency from `0.20.3` to `0.22.4` — the older version's `typescript` peer range (`^5.0.0`) didn't include this repo's `typescript@6.0.3`, so `pnpm install` reported an unmet peer dependency. No change to the published output or any public API.
