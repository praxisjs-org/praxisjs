# @praxisjs/head

## 0.2.6

### Patch Changes

- Updated dependencies [b24f603]
  - @praxisjs/decorators@1.6.0

## 0.2.5

### Patch Changes

- Updated dependencies [f1b7ee7]
  - @praxisjs/decorators@1.5.1

## 0.2.4

### Patch Changes

- Updated dependencies [55e645d]
- Updated dependencies [8ab6426]
  - @praxisjs/decorators@1.5.0
  - @praxisjs/core@2.0.0
  - @praxisjs/shared@0.3.1

## 0.2.3

### Patch Changes

- Updated dependencies [7d87288]
  - @praxisjs/core@1.8.3
  - @praxisjs/decorators@1.4.1

## 0.2.2

### Patch Changes

- Updated dependencies [bcaad96]
- Updated dependencies [376e38c]
  - @praxisjs/decorators@1.4.0
  - @praxisjs/core@1.8.2

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
