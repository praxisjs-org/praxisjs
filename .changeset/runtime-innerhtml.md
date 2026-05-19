---
"@praxisjs/runtime": patch
"@praxisjs/jsx": patch
---

Add `innerHTML` support: setting `innerHTML` on a native element now correctly assigns `element.innerHTML` (DOM property) instead of calling `setAttribute`. Also adds `innerHTML?: Reactive<string>` to `HTMLAttributes` in the JSX type definitions, enabling reactive HTML injection (`innerHTML={() => html}`).
