---
"@praxisjs/core": patch
---

Fix nested `batch()` calls overwriting the outer queue, and preserve `dirty` flag in computed signals when the compute function throws.
