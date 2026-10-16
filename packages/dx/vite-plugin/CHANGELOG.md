# @praxisjs/vite-plugin

## 4.1.0

### Minor Changes

- 75115a9: Component hot module replacement. In the dev server, `@praxisjs/vite-plugin` registers each top-level class of the app's modules with `@praxisjs/runtime` (`_$hmrRegister`), and a module whose exports are all component classes accepts its own update: every mounted instance of an edited component renders again in place with the new class, without a page reload. Modules that export anything else keep Vite's default handling.
- 75115a9: Add keyed list reconciliation. `For` (keyed by `by`, or by item identity) and `Index` (by position) in `@praxisjs/runtime` render each key once, keep its row while the key stays, and create, move or remove only the rows that changed, with the minimum number of moves (LIS) and `moveBefore()` where available. They support fallbacks, Promise-based enter/leave transitions, hydration of prerendered rows, and isolate row render errors. `@praxisjs/jsx` types components that set `static __jsxRawProps = true` by their exact constructor props, so `For` infers its item type. `@praxisjs/vite-plugin` rewrites keyed `{() => list.map((item) => <Row key={…} />)}` children into `For` and warns about keyed `.map()` calls it cannot rewrite (`keyedLists` option).
- 75115a9: Rendering and reactivity performance overhaul. `@praxisjs/core` has a new push-pull reactive graph (linked dependencies reused across runs, version-checked computeds, glitch-free effects) and keeps component internals on the instance. `@praxisjs/decorators` shares one accessor pair per `@State`/`@Prop` field, creates `@Computed` lazily, and `@Component` no longer wraps the class. `@praxisjs/runtime` adds the compiled-template helpers, a shared event dispatcher, leaner scopes and reactive children, skipped no-op prop writes, cheaper component mounting and a detached fill for large `For` renders, and fixes a static `<select>` value being lost. `@praxisjs/vite-plugin` compiles JSX trees of host elements into templates cloned per render (`templates` option, on by default).

### Patch Changes

- 75115a9: Decorated fields are defined by their innermost decorator. With `@praxisjs/vite-plugin`, `@State()`, `@Prop()`, every built-in field decorator and `createFieldDecorator` bindings install their property directly with the field's initial value instead of replacing a plain value, which kept every instance in V8's slow dictionary mode. New `addClaimableInitializer(context, init)` export for field decorators written against the TC39 API.
- 75115a9: Edge-case fixes in the new fast paths. `@praxisjs/vite-plugin` keeps a claimed field's initializer in the field's own scope instead of moving it into the constructor, where a constructor parameter or local of the same name shadowed what it read (and `new.target` fields are claimed too). `selector()` from `@praxisjs/core` compares against the current source value when read outside an effect, also inside a batch or an event handler before its subscribers are notified. `@praxisjs/runtime` keeps updating a hydrated element through a reactive child that fills it alone, rebuilds compiled templates when `render()` runs with another global document (a new SSG window), and always writes `open`, `selectedIndex`, media and scroll props from reactive bindings so a re-run restores what the user changed. Compiled templates keep the leading whitespace of JSX text (`{v} / {m}` lost its first space) and keep tabs inside a line, as the JSX transform does. Methods of `@Bind`, `@Emit` and the other built-in method decorators can be spied on with `vi.spyOn(instance, name)` before their first read again. `@praxisjs/router`'s `Link` removes its `class` attribute when it stops being active instead of leaving `class=""`.
- 75115a9: Published packages no longer contain their tests: package builds compile `src` without `src/**/__tests__` (through a `tsconfig.build.json`), and each package's `files` leaves test sources and stale compiled tests out of the tarball. `pnpm typecheck` still type-checks the tests.
- 75115a9: Cheaper creation of rows and components. `@praxisjs/runtime` builds and clones compiled templates in the inert `<template>` document (live document for templates with custom elements) and no longer touches `document` at import time, binds template event props without a listener (one capture listener per event type on the document and on each render container attaches an element's own listener on first use, same dispatch semantics), runs reactive props and children through shared functions with per-binding records instead of closures, creates text natively without JS wrappers, forks a reactive child's scope only when a run asks for it, stops wrapping single-root components in comments, writes only-child text with `textContent` and inserts arrays without a fragment. Compiled event props bind through a per-module target (`_$event`/`_$onEvent`) and reactive `class` props through `_$className`, skipping the generic prop dispatch. `@praxisjs/core`'s `getComponentAnchor()` returns a `Node` (a single-root component is anchored on its root) and every `selector()` shares one bucket class, `createContextEffect()` runs an effect whose shared function reads its state from `this.ctx`; effects record their owner even when no reactive observer is installed (`getEffectOwner()` reads it from the node). `@praxisjs/vite-plugin` also compiles lone elements that have something static or a reactive child, emits the delegated event bindings, emits a template that is an arrow function's whole body or a `return` operand as plain statements, leaves no placeholder for a reactive only child, hoists one event target per event prop name and module, emits a dedicated binding for a reactive `class`/`className`, and no longer wraps a JSX tree used as an attribute value of a compiled element in braces. Both packages keep one inert instance of each hot internal class (graph nodes and links, selector buckets, scopes, list rows, reactive children) so their V8 hidden classes survive a full GC after a list is cleared, and every list row gets the same hidden class whatever it renders.
- 75115a9: Smaller production bundles. The framework and feature packages are marked `"sideEffects": false`, so bundlers leave out the modules an app does not use (`For`/`Index` and `selector()` were kept in every bundle by their shape keepers). `@praxisjs/core`'s graph gates its observer instrumentation on a boolean that minifiers fold away when no observer is ever installed. `@praxisjs/runtime` passes `Index`'s positional update to the list view, so `For`-only apps leave it out, and builds its event prop table from camel-case names. `@praxisjs/devtools` is built one file per module and its decorators check `process.env.NODE_ENV` inline, so `@Trace`/`@Debug` in production code no longer bundle the registry and the panel. `@praxisjs/vite-plugin` serves TypeScript's decorator helpers and the claimed fields' helper from one virtual module (`virtual:praxisjs/decorators`) instead of writing them into every decorated file, and replaces the identical copies `tsc` wrote into ES module libraries.
- 75115a9: Smaller startup: `render()` hydrates only after the new `enableHydration()` (called by `ssgPlugin()`), so apps that don't prerender leave the hydration code out. **Breaking:** an app that hydrates server-rendered HTML without `ssgPlugin()` must call `enableHydration()` before `render()`. Also, compiled templates whose tree the HTML parser reads back unchanged are emitted as markup and parsed once (`_$html`); decorated fields, methods and classes call shorter lowering helpers; the list view's internal members are `#private`.
- Updated dependencies [75115a9]
- Updated dependencies [75115a9]
- Updated dependencies [75115a9]
- Updated dependencies [75115a9]
  - @praxisjs/css@0.3.5

## 4.0.6

### Patch Changes

- @praxisjs/css@0.3.4

## 4.0.5

### Patch Changes

- @praxisjs/css@0.3.3

## 4.0.4

### Patch Changes

- @praxisjs/css@0.3.2

## 4.0.3

### Patch Changes

- 192dfc0: Fix `decoratorLoweringPlugin()` (used internally by `praxisjs()`, and by `@praxisjs/storybook`'s Vite config) silently dropping decorated class fields that have no initializer, e.g. `@Styled(BadgeStyles) $s!: BadgeStyles;` or `@Ref<HTMLElement>() containerRef!: Ref<HTMLElement>;`.

  The plugin ran in Vite's default "normal" transform tier, after Vite's built-in esbuild TypeScript transform had already parsed the file. esbuild's TC39 decorator support drops such fields entirely instead of lowering them, so by the time `decoratorLoweringPlugin` ran `ts.transpileModule` on the code, the field and its decorator were already gone — with no build-time error. At runtime the field read back as `undefined`, so any component reading it (e.g. `this.$s.$root`) threw inside `render()`/`onMount()`; since neither swallowed the error nor logged it, the component silently rendered nothing.

  `decoratorLoweringPlugin()` now sets `enforce: "pre"`, so it runs before Vite's esbuild transform ever sees the file — real decorators are fully lowered first, and esbuild only has to strip types and compile JSX from output that no longer contains any decorator syntax.

## 4.0.2

### Patch Changes

- e65617f: Fix `praxisjsCSS()` build-time extraction treating tsconfig path aliases (e.g. `@/lib/tokens`, mapped via `compilerOptions.paths`) as external npm packages. The extraction sandbox resolved these to an empty stub instead of the real local file, silently dropping the CSS of any `Stylesheet` that imported values (most commonly design tokens) through an alias. Aliased imports are now resolved through esbuild's own tsconfig-aware resolver instead of being externalized.
- Updated dependencies [e65617f]
  - @praxisjs/css@0.3.1

## 4.0.1

### Patch Changes

- 22d9a4e: Move `esbuild` from `devDependencies` to `dependencies`. It's imported at runtime by the CSS extraction step, so it was missing from `node_modules` in consumer projects (e.g. `create-praxisjs` scaffolds), causing `ERR_MODULE_NOT_FOUND: esbuild` on `vite dev`/`vite build`.

## 4.0.0

### Major Changes

- 9c2a7e0: Upgraded to Vite 8 (rolldown-vite). Vite 8's oxc-based transform doesn't lower TC39 (non-legacy) decorators yet ([oxc-project/oxc#9170](https://github.com/oxc-project/oxc/issues/9170)), so `praxisjs()` now uses the TypeScript compiler (`ts.transpileModule`) to lower decorator syntax into runtime-executable code, leaving JSX untouched for oxc's own JSX pipeline. No third-party decorator transform is bundled — TypeScript's decorator lowering keeps class fields as native ES2022 fields, so a decorated field's `addInitializer` callback already runs after `super()` in a derived class's explicit constructor without any extra fix-up pass.

  The `esbuild` config key (deprecated in Vite 8) was replaced with `oxc` in the plugin's own `config()` hook.

  `typescript` moved from a `devDependency` to a regular `dependency`, since the decorator-lowering pass now calls it at runtime — it's pulled in automatically, no action needed.

  **Breaking:** `@praxisjs/vite-plugin` now requires Vite `^8.0.0`. Apps still on Vite 7 should stay on the previous `@praxisjs/vite-plugin` major version.

  **Also requires `useDefineForClassFields: true`** in your `tsconfig.json` (previously `false`) — see the updated [Getting Started](/docs/guide/getting-started) guide. With `false`, oxc silently drops a class field's decorator during its own TypeScript stripping, before the lowering step ever sees it.

  **`decoratorLoweringPlugin()` is now exported** alongside `praxisjs()`, so it can be registered directly in `vitest.config.ts` (or any other Vite-based tool) to lower decorator syntax outside of the full `praxisjs()` plugin — see [Using decorators in Vitest](/docs/tooling/vite-plugin#using-decorators-in-vitest).

## 3.0.0

### Patch Changes

- Updated dependencies [6140752]
  - @praxisjs/css@0.3.0

## 2.0.0

### Patch Changes

- Updated dependencies [ffc4aec]
  - @praxisjs/css@0.2.0

## 1.0.7

### Patch Changes

- @praxisjs/css@0.1.7

## 1.0.6

### Patch Changes

- Updated dependencies [8ab6426]
  - @praxisjs/css@0.1.6

## 1.0.5

### Patch Changes

- @praxisjs/css@0.1.5

## 1.0.4

### Patch Changes

- @praxisjs/css@0.1.4

## 1.0.3

### Patch Changes

- @praxisjs/css@0.1.3

## 1.0.2

### Patch Changes

- @praxisjs/css@0.1.2

## 1.0.1

### Patch Changes

- @praxisjs/css@0.1.1

## 1.0.0

### Minor Changes

- 8abc950: Add `praxisjsCSS()` — static CSS extraction plugin for `@praxisjs/css`.

  Scans TypeScript source files for `Stylesheet` subclasses, `keyframes()`, `globalStyle()`, and `@Themed()` decorators, evaluates them in a sandboxed Node.js context, and emits all CSS into `virtual:praxisjs/styles.css`. In production, runtime `<style>` injection is disabled via `__PRAXIS_CSS_STATIC__`. In development, the virtual module is empty and CSS is injected at runtime as usual.

  ```ts
  // vite.config.ts
  import { praxisjs, praxisjsCSS } from "@praxisjs/vite-plugin";

  export default defineConfig({
    plugins: [praxisjs(), praxisjsCSS()],
  });
  ```

  ```ts
  // main.ts
  import "virtual:praxisjs/styles.css";
  ```

  `@praxisjs/css` is now a peer dependency.

### Patch Changes

- Updated dependencies [74fabcc]
  - @praxisjs/css@0.1.0

## 0.1.1

### Patch Changes

- 2c61a25: Refresh dependencies across workspace to improve stability and security.

  Bumped versions of several packages, including @types/node, eslint, and unocss, to enhance compatibility and security.

## 0.1.0

### Minor Changes

- aaf7dab: Initial beta release
