---
"@praxisjs/runtime": patch
---

`VALUE_PROPS` replaced with runtime feature detection.

Instead of a hardcoded list of prop names, the runtime now checks whether a prop resolves to a real, assignable property (a setter, or a writable data property) on the element's prototype chain, and writes it there automatically instead of as an attribute. Any current or future DOM property with this quirk (e.g. `checked`, `value`, `selected`, `innerHTML`) is now covered with no list to maintain. Read-only accessors — SVG geometry (`width`, `cx`, `r`…) and reference/collection getters like `list`, `form`, `part`, `classList` — are detected and correctly fall back to `setAttribute` instead of throwing.
