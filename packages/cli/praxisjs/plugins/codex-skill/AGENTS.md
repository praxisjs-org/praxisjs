# [Project name]

## Working agreements
- Always consult praxisjs.org docs before writing PraxisJS code — use the praxisjs Codex skill
- Never hardcode version numbers in package.json — install packages via CLI without specifying a version
- Update this file whenever an architectural decision is made

## Stack
- PraxisJS [version] + packages: @praxisjs/[list]
- Build: Vite [version] + @praxisjs/vite-plugin
- Routing: [@praxisjs/router / none]
- State: [@praxisjs/store / none]

## Architecture
[2–4 sentences: what the app does, how it's organized, main entry points]

## Conventions
[Project-specific patterns — e.g. "all forms extend FormBase", "stores are singletons injected via @UseStore"]

## Known constraints
[Anything that would surprise a developer — auth, browser targets, env vars, etc.]
