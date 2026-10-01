---
"@praxisjs/content": patch
---

`getCollection()` caches the loaded, parsed and rendered entries per collection (callers get a copy of the array; failed loads are not cached), so list and detail pages — or every page of an SSG run — no longer re-parse all the markdown.
