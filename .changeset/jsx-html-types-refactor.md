---
"@praxisjs/jsx": minor
---

Refactor `@praxisjs/jsx` HTML/SVG type definitions to a React-style layered architecture.

**Breaking change (type-only):** the `[key: string]: HTMLAttributes` catch-all index signature has been removed from `JSX.IntrinsicElements`. Typos like `<dvi>` are now compile-time errors instead of silently resolving to `HTMLAttributes`.

**What's new:**

- `LiteralUnion<T>` widening applied to all string-literal attribute unions (`ButtonType`, `HTMLInputTypeAttribute`, `FormMethod`, `LinkTarget`, `ReferrerPolicy`, etc.) — a `string`-typed variable is now assignable without a cast, while IDE autocomplete still surfaces the canonical values
- `CSSProperties` type for object-style `style` props with full camelCase CSS property autocomplete and CSS custom property (`--xxx`) support
- `AriaAttributes` — complete WAI-ARIA 1.2 attribute set
- `DOMAttributes<T extends EventTarget>` — all event handlers with `currentTarget` narrowed to the host element type
- `HTMLAttributes<T extends Element>` — generic base with element-specific `ref: (el: T) => void`
- 40+ per-element attribute interfaces (`ButtonHTMLAttributes`, `InputHTMLAttributes`, `AnchorHTMLAttributes`, `ImgHTMLAttributes`, `FormHTMLAttributes`, `SelectHTMLAttributes`, `TextareaHTMLAttributes`, `VideoHTMLAttributes`, `DialogHTMLAttributes`, …)
- `SVGAttributes<T>` covering all SVG elements the runtime routes through the SVG namespace
- Full HTML element coverage: ~120 intrinsic element entries across metadata, sectioning, grouping, text-level, embedded, form, interactive, tabular, and scripting categories
- All new attribute interfaces are re-exported from `@praxisjs/jsx` for use in application code

`InstancePropsOf` now automatically infers `@Prop()` and `@State()` fields from `StatefulComponent` subclasses as JSX props. A `FrameworkKeys` template-literal pattern (`_${string}` plus lifecycle method names) strips all framework internals, so no explicit prop declaration is needed.
