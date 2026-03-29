---
"@praxisjs/di": minor
---

Circular dependencies are now detected during resolution and throw a descriptive error showing the full dependency chain (e.g. `ServiceA → ServiceB → ServiceA`).
