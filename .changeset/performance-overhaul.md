---
"@praxisjs/core": minor
"@praxisjs/decorators": minor
"@praxisjs/runtime": minor
"@praxisjs/vite-plugin": minor
---

Rendering and reactivity performance overhaul. `@praxisjs/core` has a new push-pull reactive graph (linked dependencies reused across runs, version-checked computeds, glitch-free effects) and keeps component internals on the instance. `@praxisjs/decorators` shares one accessor pair per `@State`/`@Prop` field, creates `@Computed` lazily, and `@Component` no longer wraps the class. `@praxisjs/runtime` adds the compiled-template helpers, a shared event dispatcher, leaner scopes and reactive children, skipped no-op prop writes, cheaper component mounting and a detached fill for large `For` renders, and fixes a static `<select>` value being lost. `@praxisjs/vite-plugin` compiles JSX trees of host elements into templates cloned per render (`templates` option, on by default).
