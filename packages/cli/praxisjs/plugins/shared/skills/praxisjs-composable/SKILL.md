---
name: praxisjs-composable
description: Create a PraxisJS composable (a Composable class attached with @Compose) for reusable reactive logic such as a DOM or browser API, a subscription or shared lifecycle code. Use when the same onMount/onUnmount pattern appears in several components or the user asks for a composable.
---

# Create a PraxisJS composable

Follow the `praxisjs` skill's rules. Reference: `../praxisjs/references/extending.md`.

## 1. Check what exists

`praxisjs_memory_check_duplicate({ description })`. `@praxisjs/composables` already has `WindowSize`,
`ScrollPosition`, `ElementSize`, `Intersection`, `Focus`, `MediaQuery`, `ColorScheme`, `Mouse`,
`KeyCombo`, `Idle`, `Clipboard`, `Geolocation`, `TimeAgo`, `Pagination`, `VirtualList`,
`FileSelection`, `DropZone`, `FileUpload`, `FilePreview` (`praxisjs_list_apis({ kind: "composable" })`).

## 2. Read the docs

`praxisjs_get_page({ page: "advanced/custom-composables" })`: `setup()`, `declare`d typed properties,
constructor arguments, the `getter()` helper and cleanup.

## 3. Write it

- `praxisjs_scaffold({ kind: "composable", name })` gives the path (the project's composables folder).
- `class X extends Composable` (`@praxisjs/core`), `setup()` creates signals (`signal`/`computed` from
  `@praxisjs/core/internal`) and returns them under the names declared with `declare`.
- Release listeners and timers in `onUnmount()`.
- Components attach it with `@Compose(X) x!: X` and read `this.x.value` inside JSX arrows; never `new X()`.
- Inputs that change come in through `getter('propName')` or a string ref argument, as the docs show.

## 4. Test, validate, record

Test it through a small component that composes it (`praxisjs-testing`), run
`praxisjs_validate_file`, then `praxisjs_memory_add({ category: "utilities", entry: { kind:
"composable", … } })`.
