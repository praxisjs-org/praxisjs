---
"create-praxisjs": major
---

The `add` command (installs an AI integration into an existing project) has moved out of `create-praxisjs` into a new `praxisjs` CLI package. Run `npx praxisjs add` instead of `npx create-praxisjs add`. `create-praxisjs` now depends on `praxisjs` for the shared plugin logic used during initial scaffolding.
