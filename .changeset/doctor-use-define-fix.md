---
"praxisjs": patch
---

`praxisjs doctor` now flags `useDefineForClassFields: false` instead of `true`, matching the Vite 8 / oxc requirement (see the `@praxisjs/vite-plugin` changelog). Projects still on the old Vite 7 setup with `false` will need to flip this once they upgrade.

Bumped the `tsdown` build dependency from `0.20.3` to `0.22.4` — the older version's `typescript` peer range (`^5.0.0`) didn't include this repo's `typescript@6.0.3`, so `pnpm install` reported an unmet peer dependency. No change to the published output.
