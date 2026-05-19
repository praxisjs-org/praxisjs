---
"@praxisjs/composables": patch
---

Internal: `ScrollPosition._target` getter converted to a private `_resolveTarget()` method. The resolution logic was restructured from a single ternary line to explicit conditional branches for clarity. No behaviour change — `onMount`, `onUnmount`, and the scroll event handler are unaffected.
