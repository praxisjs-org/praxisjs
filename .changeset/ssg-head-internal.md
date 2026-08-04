---
"@praxisjs/head": minor
---

Add a `@praxisjs/head/internal` entry point exporting `resetHeadState()`, so `@praxisjs/ssg`'s prerender runner can clear `<head>` tag state between routes rendered in the same Node process.
