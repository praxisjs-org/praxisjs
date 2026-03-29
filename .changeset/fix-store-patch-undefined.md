---
"@praxisjs/store": patch
---

`$patch` now skips `undefined` values, preventing partial updates from overwriting existing state with `undefined`.
