---
"@praxisjs/runtime": patch
"@praxisjs/jsx": patch
---

`innerHTML` prop support and JSX type fixes.

- `@praxisjs/runtime` — `innerHTML` now correctly assigns `element.innerHTML` (DOM property) instead of calling `setAttribute`. Supports reactive values: `innerHTML={() => this.html}`.
- `@praxisjs/jsx` — `innerHTML?: Reactive<string>` added to `HTMLAttributes`. `LibraryManagedAttributes` now includes `children?: Children` for all component types, so components using `@Slot` or receiving JSX children no longer produce a TypeScript error at the call site.
