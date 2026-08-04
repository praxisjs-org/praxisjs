---
"@praxisjs/core": minor
---

Add a resource settle barrier and a server-render-pass flag for `@praxisjs/ssg`.

`flushPendingResources()` (from `@praxisjs/core/internal`) awaits every `resource()` fetch — keyed or not — that starts while a server render pass is active, including ones triggered by resources that themselves settle while waiting. `setServerRenderPass()` / `isServerRenderPass()` mark that pass; both are no-ops outside of it, so client-only apps see zero behavior or performance change.

Also expose `trackPendingResource()` from `@praxisjs/core/internal`, so other framework packages can register their own in-flight async work (not just `resource()` calls) against the same settle barrier — used by `@praxisjs/router` to track lazy route/layout resolution during a server render pass.
