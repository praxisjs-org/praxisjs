---
"@praxisjs/runtime": patch
---

New: `Portal` — renders a JSX subtree into a target DOM node outside the component's natural parent. Exports `Portal` class and `PortalProps` interface from `@praxisjs/runtime`. Integrates with the scope system for automatic cleanup on unmount.

Internal: `resolvePortalTarget` is now an exported named function (previously file-private). The function is not re-exported from the package index and remains an implementation detail.
