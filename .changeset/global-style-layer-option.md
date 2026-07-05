---
"@praxisjs/css": minor
---

`globalStyle()` now accepts a `layer` option to wrap the injected CSS in a named `@layer`, so it can be ordered against other layered CSS (e.g. Tailwind utilities) instead of always winning the cascade regardless of specificity. `preflight()` is now implemented on top of this option.
