---
"@praxisjs/router": patch
---

Resolve a route's component and layout in parallel and apply them in one update, so `RouterView` rebuilds once with a consistent pair (no layout-less flash, no sequential lazy-chunk waterfall). Plain and already-loaded lazy routes are applied synchronously. A layout that fails to load still rejects the navigation after the page is shown. Route matching runs once per path.
