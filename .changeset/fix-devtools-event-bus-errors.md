---
"@praxisjs/devtools": patch
---

Event bus handlers no longer short-circuit on the first error — all handlers run and errors are collected into an `AggregateError`.
