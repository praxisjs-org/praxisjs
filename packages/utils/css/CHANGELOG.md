# @praxisjs/css

## 0.1.7

### Patch Changes

- Updated dependencies [f1b7ee7]
  - @praxisjs/decorators@1.5.1

## 0.1.6

### Patch Changes

- 8ab6426: Move component runtime state out of public instances and behind internal helpers.

  BREAKING CHANGE: `RootComponent`, `StatefulComponent`, and `ReactiveStore` no longer expose framework-only underscore internals or `StatefulComponent.props` as public instance API.

  `RootComponent` and `StatefulComponent` no longer expose framework-only underscore fields such as `_rawProps`, `_mounted`, `_anchor`, `_setProps`, `_defaults`, or `_stateDirty`. The renderer, decorators, JSX types, and first-party CSS utilities now use helpers from `@praxisjs/core/internal` to access that state.

  For app code, `StatefulComponent` props should continue to be modeled with `@Prop()` fields. `StatelessComponent<T>` keeps its public `props` getter.

  This also clarifies the intended props API: `StatelessComponent.props` is public, while `StatefulComponent` subclasses should read parent-provided values through `@Prop()` fields instead of `props`.

  `ReactiveStore` now uses a type-only reactive-host marker for `@State`/`@DeepState` compatibility and no longer creates `_stateDirty` on store instances.

- Updated dependencies [55e645d]
- Updated dependencies [8ab6426]
  - @praxisjs/decorators@1.5.0
  - @praxisjs/core@2.0.0

## 0.1.5

### Patch Changes

- Updated dependencies [7d87288]
  - @praxisjs/core@1.8.3
  - @praxisjs/decorators@1.4.1

## 0.1.4

### Patch Changes

- Updated dependencies [bcaad96]
- Updated dependencies [376e38c]
  - @praxisjs/decorators@1.4.0
  - @praxisjs/core@1.8.2

## 0.1.3

### Patch Changes

- Updated dependencies [dc031d0]
  - @praxisjs/core@1.8.1
  - @praxisjs/decorators@1.3.1

## 0.1.2

### Patch Changes

- Updated dependencies [80442e0]
  - @praxisjs/decorators@1.3.0
  - @praxisjs/core@1.8.0

## 0.1.1

### Patch Changes

- Updated dependencies [3fb2309]
  - @praxisjs/decorators@1.2.0

## 0.1.0

### Minor Changes

- 74fabcc: Initial release of `@praxisjs/css`.

  Scoped CSS with typed class names, reactive CSS custom properties, a fluent builder, design tokens, and static build-time extraction via the `praxisjsCSS()` Vite plugin.

  **Stylesheet API**: `Stylesheet`, `ReactiveStylesheet`, `@Styled()`, `this.css({})`, `@Param()`, `@Style()`, `keyframes()`, `cx()`.

  **`globalStyle(factory)`** — injects unscoped CSS via a factory that receives `css` (= `createCSSBuilder`, same as `this.css()` in `Stylesheet`) and returns a `CSSBuilder` or raw string. Use `.on(selector, props)` for element rules.

  **`preflight()`** — opinionated browser reset inspired by Tailwind CSS preflight, with standard system font stacks (no Tailwind-specific references). Idempotent and statically extracted by the Vite plugin.

  **Design tokens**: `TokenSheet`, `tokenVars()`, `ThemeInstance`, `@Themed()`, `@Theme()`, `theme()`.

  **Static extraction**: `praxisjsCSS()` Vite plugin (exported from `@praxisjs/vite-plugin`) extracts all CSS at build time into `virtual:praxisjs/styles.css`.

  **SSR / integrator APIs**: `@praxisjs/css/server` (collector API) and `@praxisjs/css/extract` (build-time extraction module).

### Patch Changes

- Updated dependencies [a0372af]
  - @praxisjs/decorators@1.1.1
