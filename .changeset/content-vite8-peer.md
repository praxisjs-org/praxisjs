---
"@praxisjs/content": patch
---

`peerDependencies.vite` raised from `>=7.0.0` to `>=8.0.0`, matching the Vite 8 requirement the rest of the ecosystem (`@praxisjs/vite-plugin`) already enforces. `contentPlugin()` itself has no Vite-version-specific behavior — this only corrects the declared range so package managers warn projects still on Vite 7 instead of letting them install a combination that doesn't actually work once decorators are involved.
