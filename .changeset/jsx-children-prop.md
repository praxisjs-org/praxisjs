---
"@praxisjs/jsx": patch
---

Fix `children` prop not being recognized on component JSX usage.

`LibraryManagedAttributes` now includes `children?: Children` for all component types, so components using `@Slot` (or any component receiving JSX children) no longer produce a TypeScript error at the call site.
