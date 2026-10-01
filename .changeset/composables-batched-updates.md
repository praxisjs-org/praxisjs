---
"@praxisjs/composables": patch
---

`Mouse`, `WindowSize`, `ScrollPosition` and `ElementSize` update their paired values in one batch, so bindings reading both re-run once per event.
