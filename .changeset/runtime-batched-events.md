---
"@praxisjs/runtime": minor
---

JSX event handlers now run inside `batch()`, so multiple state writes in one handler re-run dependent effects once. Also: a single shared microtask drains all `onMount` hooks of a mount pass, the writable-property lookup used for JSX props is cached per prototype, `Portal` attaches its subtree in one operation, and `ref` callbacks run untracked.

Replacing or removing a multi-node reactive child (and `Portal` cleanup) now walks the sibling nodes instead of allocating a `Range` per update, which is several times faster (rebuilding a 500-row list: ~3.2 ms → ~0.2 ms in a browser benchmark).
