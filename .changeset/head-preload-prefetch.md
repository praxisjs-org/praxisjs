---
"@praxisjs/head": minor
---

Add `preload` and `prefetch` link support to `@Head` / `HeadConfig`.

- `preload?: LinkPreload[]` — emits `<link rel="preload">` tags with `href`, `as`, optional `type` and `crossOrigin`
- `prefetch?: LinkPrefetch[]` — emits `<link rel="prefetch">` tags with `href` and optional `as`

Both fields are reactive when used inside a getter and cleaned up automatically on component unmount.
