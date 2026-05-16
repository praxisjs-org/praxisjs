---
"@praxisjs/runtime": patch
---

Optimize DOM patching in the runtime for lower allocation and fewer reflows.

**element.ts** — prop iteration now uses `for...in` instead of `Object.entries()`, avoiding the intermediate key-value array allocation per element mount.

**reactive.ts** — `normalizeToNodes` (returned a new array on every call) is replaced by `collectNodes` (accumulates into a caller-supplied array), removing one allocation per reactive update. Node insertion is batched through `nodesToFragment`: when multiple nodes are produced, they are appended to a `DocumentFragment` and inserted in a single `insertBefore` call. Bulk removal of existing nodes uses `Range.deleteContents()` instead of individual `removeChild` calls, reducing the number of reflow-triggering operations to one.

No changes to the public API.
