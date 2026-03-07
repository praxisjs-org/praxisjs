---
"@praxisjs/jsx": patch
"@praxisjs/decorators": patch
"@praxisjs/devtools": patch
---

Fix JSX prop typing for `StatelessComponent` to automatically accept reactive values (`() => T`) without requiring manual declaration. `LibraryManagedAttributes` now uses `InstancePropsOf` directly instead of intersecting with the raw constructor props, preventing the erroneous `T | (T & (() => T))` type expansion.

`InstancePropsOf` now uses `_rawProps` to infer props for class components decorated with `@Prop()`, providing accurate JSX prop types without manual interface declarations.

The `@Emit` decorator type signature was relaxed from `unknown` to `any` to allow broader method compatibility. Devtools `Panel` and `DevToolsApp` components were refactored to use `@Prop()` and `@Emit()` decorators instead of manual props casting.
