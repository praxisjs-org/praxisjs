---
"@praxisjs/css": minor
---

`preflight()` now wraps its reset in `@layer reset` by default so it can be ordered against other layered CSS (e.g. Tailwind utilities) instead of always winning the cascade regardless of specificity. Pass `preflight({ layer: 'custom-name' })` to rename the layer, or `preflight({ layer: false })` to opt back into un-layered CSS.
