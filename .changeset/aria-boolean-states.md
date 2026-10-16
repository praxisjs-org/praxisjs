---
"@praxisjs/runtime": patch
"@praxisjs/vite-plugin": patch
---

Write boolean `aria-*` attributes as `"true"` and `"false"` instead of an empty attribute (or none for `false`), which assistive technology reads as an unset state. Compiled templates emit the same markup. `data-*` and HTML boolean attributes are unchanged.
