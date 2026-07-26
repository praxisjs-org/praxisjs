---
"@praxisjs/vite-plugin": patch
---

Fix `decoratorLoweringPlugin()` (used internally by `praxisjs()`, and by `@praxisjs/storybook`'s Vite config) silently dropping decorated class fields that have no initializer, e.g. `@Styled(BadgeStyles) $s!: BadgeStyles;` or `@Ref<HTMLElement>() containerRef!: Ref<HTMLElement>;`.

The plugin ran in Vite's default "normal" transform tier, after Vite's built-in esbuild TypeScript transform had already parsed the file. esbuild's TC39 decorator support drops such fields entirely instead of lowering them, so by the time `decoratorLoweringPlugin` ran `ts.transpileModule` on the code, the field and its decorator were already gone — with no build-time error. At runtime the field read back as `undefined`, so any component reading it (e.g. `this.$s.$root`) threw inside `render()`/`onMount()`; since neither swallowed the error nor logged it, the component silently rendered nothing.

`decoratorLoweringPlugin()` now sets `enforce: "pre"`, so it runs before Vite's esbuild transform ever sees the file — real decorators are fully lowered first, and esbuild only has to strip types and compile JSX from output that no longer contains any decorator syntax.
