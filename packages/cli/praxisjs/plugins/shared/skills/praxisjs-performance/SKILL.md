---
name: praxisjs-performance
description: Diagnose and fix slow PraxisJS UIs — measure with the devtools profiler, Performance tab and @Trace, then apply For/Index, @Selector, @Lazy, VirtualList and the docs' Performance guidance. Use when the user reports a slow page, janky list, too many renders, or asks to optimize a PraxisJS app.
---

# Diagnose PraxisJS performance

Follow the `praxisjs` skill's rules. Measure first, change one thing at a time, measure again.

## 1. Read

`praxisjs_get_page` for `performance/writing-fast-code`, `performance/why-it-is-fast`,
`decorators/performance`, `decorators/dx`, `tooling/devtools`, and `essentials/lists` for lists.

## 2. Measure

- Devtools in development only: `DevTools.init()` behind a dev-only dynamic import (`tooling/devtools`).
- `@Trace({ slow: 8 })` on the suspect components (above `@Component()`): render counts and durations,
  warnings for renders slower than `slow` ms.
- The Performance tab, or `Registry.instance.profiler` (`start()`, `stop()`, `snapshot()`), for a
  profile of a real interaction.
- `@Debug({ log: true })` on a field to see what changes it and how often.
- Run `praxisjs_validate_file({ path: "src" })`: `static-read` and `in-place-mutation` findings often
  explain "it doesn't update" or "it updates too much".

## 3. Common causes and fixes

| Symptom | Fix |
|---|---|
| A list re-renders entirely on every change | `<For each={() => this.items} by="id">` (or `Index`) instead of `{() => this.items.map(...)}` |
| Every row re-runs when the selection changes | `@Selector('selected') isSelected!: Selector<K>` and `this.isSelected(row.id)` |
| Thousands of rows | `VirtualList` (`composables/list`) |
| Heavy component below the fold | `@Lazy()` from `@praxisjs/decorators` |
| A derived value recomputed in many bindings | `@Computed()` getter |
| One arrow reading many signals updates too often | split it into smaller arrows, each reading what it shows |
| Handler firing on every keystroke/scroll | `@Debounce(ms)` / `@Throttle(ms)` |
| Big objects updated by copying on every change | `@DeepState()` for nested mutation, or split the state |
| Many concurrent requests racing | `@Task`, `@Queue`, `@Pool` (`ecosystem/concurrency`) |

Keep `@praxisjs/vite-plugin` defaults on (compiled templates, keyed-list rewrite). Remove `@Trace` /
`@Debug` when done (they are no-ops in production builds, but noise in code).

## 4. Record

A non-obvious performance decision (virtualizing a list, a store split) goes in the project memory as
an `architecture` entry, so nobody undoes it.
