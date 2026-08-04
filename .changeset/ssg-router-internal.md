---
"@praxisjs/router": minor
---

Expose `createRouter` from `@praxisjs/router/internal`. `@praxisjs/ssg`'s prerender runner needs to rebind the router to a fresh `window.location` before rendering each route — the `@Router([...])` class decorator only calls `createRouter` once, at the first time the app module is imported.

Fix: the router's initial navigation (resolving the component/layout for the starting URL, kicked off unawaited from the constructor) is now tracked as a pending resource via `@praxisjs/core/internal`'s `trackPendingResource()`. Previously, a `@praxisjs/ssg` prerender pass for a `Lazy(...)`-wrapped route could serialize the page — and close its underlying Vite SSR module runner — before that dynamic import settled, producing pages with missing route content and, once the import finally resolved against an already-closed module runner, an unhandled rejection that crashed the build. This is a no-op outside of a server render pass, so client-side navigation is unaffected.
