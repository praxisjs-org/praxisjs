---
"@praxisjs/runtime": patch
---

CSS custom properties (keys starting with `--`) are now applied via `setProperty()` so they work correctly in style objects. Scope cleanup functions no longer halt on the first error — all cleanups run and errors are collected into an `AggregateError`.
