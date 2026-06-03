# @praxisjs/css

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
