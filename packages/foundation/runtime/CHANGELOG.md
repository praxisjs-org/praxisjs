# @praxisjs/runtime

## 0.2.9

### Patch Changes

- 6c353ba: Add `untrack` utility and isolate component mounting from outer reactive contexts

  **`@praxisjs/core`** exports two new functions from the public API:

  - `peek(signal)` — reads a signal once without subscribing to it (was already in `/internal`, now public)
  - `untrack(fn)` — runs a function with no active effect, suppressing all signal tracking inside it

  ```ts
  import { peek, untrack } from "@praxisjs/core";

  // read a signal without creating a dependency
  if (peek(this.max) > peek(this.count)) {
    this.count++;
  }

  // suppress tracking for a block of reads
  const snapshot = untrack(() => this.totalCost);
  ```

  **`@praxisjs/runtime`** — `mountComponent` now runs entirely inside `untrack`. This fixes a bug where components mounted inside a reactive context (e.g. the router) would accidentally subscribe the outer effect to any signal read during construction or render. The symptoms were:

  - Eager reads like `description={this.count}` in JSX causing the router to re-mount the component on every state change, resetting state to its initial value
  - `@Debug()` (and any decorator that reads a signal in its `addInitializer`) triggering the same re-mount loop

  Reactive subscriptions set up via `{() => signal}` in JSX are unaffected — each arrow function creates its own isolated effect.

- Updated dependencies [6c353ba]
  - @praxisjs/core@1.2.0
  - @praxisjs/decorators@0.7.1

## 0.2.8

### Patch Changes

- Updated dependencies [2b8c768]
  - @praxisjs/decorators@0.7.0

## 0.2.7

### Patch Changes

- Updated dependencies [72cd9a8]
  - @praxisjs/decorators@0.6.1

## 0.2.6

### Patch Changes

- 029ef04: CSS custom properties (keys starting with `--`) are now applied via `setProperty()` so they work correctly in style objects. Scope cleanup functions no longer halt on the first error — all cleanups run and errors are collected into an `AggregateError`.
- Updated dependencies [029ef04]
- Updated dependencies [029ef04]
- Updated dependencies [029ef04]
- Updated dependencies [029ef04]
- Updated dependencies [029ef04]
  - @praxisjs/core@1.1.0
  - @praxisjs/decorators@0.6.0

## 0.2.5

### Patch Changes

- Updated dependencies [3372878]
- Updated dependencies [feaa478]
  - @praxisjs/core@1.0.0
  - @praxisjs/decorators@0.5.0

## 0.2.4

### Patch Changes

- Updated dependencies [ea59035]
- Updated dependencies [d11a10a]
  - @praxisjs/decorators@0.4.3
  - @praxisjs/core@0.4.2

## 0.2.3

### Patch Changes

- Updated dependencies [fe39901]
- Updated dependencies [fe39901]
  - @praxisjs/decorators@0.4.2
  - @praxisjs/core@0.4.1

## 0.2.2

### Patch Changes

- Updated dependencies [966efdc]
  - @praxisjs/decorators@0.4.1

## 0.2.1

### Patch Changes

- Updated dependencies [f52354d]
  - @praxisjs/decorators@0.4.0
  - @praxisjs/core@0.4.0

## 0.2.0

### Minor Changes

- bb0d4f8: **Refactor decorator system and component architecture across PraxisJS packages**

  - Replaced legacy decorator signatures (`constructor`, `target`, `propertyKey`, method descriptor) with the standard TC39 decorator context API (`ClassDecoratorContext`, `ClassFieldDecoratorContext`, `ClassMethodDecoratorContext`) across `@praxisjs/decorators`, `@praxisjs/store`, `@praxisjs/concurrent`, `@praxisjs/router`, `@praxisjs/motion`, `@praxisjs/di`, and `@praxisjs/fsm`.
  - Introduced `StatefulComponent` and `StatelessComponent` as the new base classes, replacing the deprecated `BaseComponent`/`Function Component` pattern, across `@praxisjs/core`, `@praxisjs/runtime`, `@praxisjs/devtools`, and templates.
  - Implemented core rendering functionality in `@praxisjs/runtime` (`mountChildren`, `mountComponent`, reactive scope management) and removed the deprecated `renderer.ts`.
  - Refactored `@praxisjs/jsx` to delegate rendering to `@praxisjs/runtime` and improved type safety with `flattenChildren` and `isComponent` utilities.
  - Updated internal module structure with new `internal` exports in `package.json` files for shared utilities and types.
  - Removed `experimentalDecorators`/`emitDecoratorMetadata` from `tsconfig.json` in favor of native decorator support.

### Patch Changes

- Updated dependencies [bb0d4f8]
  - @praxisjs/decorators@0.3.0
  - @praxisjs/core@0.3.0
  - @praxisjs/shared@0.2.0

## 0.1.1

### Patch Changes

- Updated dependencies [f48dbc4]
  - @praxisjs/core@0.2.0
  - @praxisjs/decorators@0.2.0

## 0.1.0

### Minor Changes

- aaf7dab: Initial beta release

### Patch Changes

- Updated dependencies [aaf7dab]
  - @praxisjs/core@0.1.0
  - @praxisjs/decorators@0.1.0
  - @praxisjs/jsx@0.1.0
  - @praxisjs/shared@0.1.0
