---
"create-praxisjs": patch
---

Update template dependency versions to pick up latest bug fixes

Bumps `@praxisjs/decorators`, `@praxisjs/core`, and `@praxisjs/devtools` across the `minimal`, `router`, and `full` templates so that projects scaffolded with `create-praxisjs` start with the latest releases. Notable fixes included:

- `effect()` stop now correctly prevents re-runs (`@praxisjs/core`)
- `@Watch` no longer leaks reactive effects after unmount — the effect is now stopped in `onUnmount` (`@praxisjs/decorators`)
- `@Lazy` no longer recurses infinitely when `render()` is called after the component becomes visible (`@praxisjs/decorators`)
- `@Lazy` / `@Virtual` type constraint widened to accept any `StatefulComponent` subclass (`@praxisjs/decorators`)
- Devtools panel CSS bundle regenerated with new UnoCSS utility aliases (`@praxisjs/devtools`)
