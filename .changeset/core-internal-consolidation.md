---
"@praxisjs/core": patch
---

Internal consolidation: move `_setProps` to `RootComponent` and mark internal fields with `@internal`.

`_setProps(props)` was implemented identically in both `StatefulComponent` and `StatelessComponent`. It is now defined once on `RootComponent` and removed from the subclasses.

The following fields on `RootComponent`, `StatefulComponent` are now annotated with `@internal` JSDoc tags and descriptions so they are hidden from TypeDoc output and IDE autocomplete:

- `RootComponent._rawProps` — props filled by the renderer on instantiation and update
- `RootComponent._mounted` — becomes `true` after `onMount` fires
- `RootComponent._anchor` — end-comment node set by the runtime; used by decorators to locate the parent element
- `StatefulComponent._defaults` — default field values used to reset props on update
- `StatefulComponent._stateDirty` — set by `@State` on any write; cleared by the renderer after each re-render

No public API changes.
