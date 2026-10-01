---
"@praxisjs/store": patch
---

`createStore` actions keep a stable wrapper identity, `$patch()` and `$reset()` run in a single batch, and the previous value passed to `onMutation` is read untracked.
