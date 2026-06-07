---
"@praxisjs/jsx": patch
"@praxisjs/runtime": patch
---

Fix fragment primitive children and improve runtime cleanup.

`@praxisjs/jsx` now preserves primitive fragment children like strings and `0` by converting them to text nodes.

`@praxisjs/runtime` now skips the queued `onMount` and `ref(instance)` callbacks if a component is disposed before the mount microtask runs.

Reactive child scopes no longer register a new parent cleanup on every update, and portal cleanup now tolerates anchors that were removed externally before disposal.
