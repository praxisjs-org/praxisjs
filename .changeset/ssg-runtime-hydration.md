---
"@praxisjs/runtime": minor
---

`render()` now hydrates prerendered HTML instead of discarding it, when the container carries the marker `@praxisjs/ssg` writes onto its static output.

The tree is still built the normal way (same `mountElement`/`mountComponent`/`mountReactive` code path, unchanged for every existing app), just into a detached node first. A new reconciliation pass then walks that fresh tree against the container's existing DOM: matching elements keep the real, already-attached node (with props and listeners replayed onto it) instead of being recreated, while text/comment nodes and any local mismatch are recreated as before. `Portal` is skipped during a server render pass (`isServerRenderPass()` from `@praxisjs/core/internal`) so its content is never baked into static HTML, avoiding duplication once it mounts normally on the client.

Apps that never render server-provided HTML are unaffected — `render()`'s create-mode path is unchanged.
