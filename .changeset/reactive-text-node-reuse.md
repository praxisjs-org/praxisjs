---
"@praxisjs/runtime": patch
---

Update reactive text in place. A reactive child that returns a string or number rewrites its existing text node, and skips the write when the text is unchanged, instead of replacing the node on every re-run.
