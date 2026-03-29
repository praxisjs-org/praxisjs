---
"@praxisjs/core": patch
---

Isolate subscriber errors during signal updates — all subscribers now run even when one throws, and the last error is re-thrown after all have executed.
