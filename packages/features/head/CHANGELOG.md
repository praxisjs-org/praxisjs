# @praxisjs/head

## 0.2.1

### Patch Changes

- Updated dependencies [dc031d0]
  - @praxisjs/core@1.8.1
  - @praxisjs/decorators@1.3.1

## 0.2.0

### Minor Changes

- f8ccd4b: Add `preload` and `prefetch` link support to `@Head` / `HeadConfig`.
  - `preload?: LinkPreload[]` — emits `<link rel="preload">` tags with `href`, `as`, optional `type` and `crossOrigin`
  - `prefetch?: LinkPrefetch[]` — emits `<link rel="prefetch">` tags with `href` and optional `as`

  Both fields are reactive when used inside a getter and cleaned up automatically on component unmount.

### Patch Changes

- Updated dependencies [80442e0]
  - @praxisjs/decorators@1.3.0
  - @praxisjs/core@1.8.0
  - @praxisjs/shared@0.3.0

## 0.1.2

### Patch Changes

- Updated dependencies [3fb2309]
  - @praxisjs/decorators@1.2.0

## 0.1.1

### Patch Changes

- Updated dependencies [a0372af]
  - @praxisjs/decorators@1.1.1

## 0.1.0

### Minor Changes

- 2837664: Initial release of `@praxisjs/head` — reactive document head management via `@Head` class decorator. Supports title, description, canonical, arbitrary meta[], og:_, and twitter:_. Stack-based with automatic cleanup on component unmount.

### Patch Changes

- Updated dependencies [378cc54]
  - @praxisjs/core@1.7.0
  - @praxisjs/decorators@1.1.0
