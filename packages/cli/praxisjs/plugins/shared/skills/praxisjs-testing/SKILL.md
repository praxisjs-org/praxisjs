---
name: praxisjs-testing
description: Write and run tests for PraxisJS code with Vitest — components rendered into jsdom, stores, composables and custom decorators — including the decorator lowering setup and coverage expectations. Use when adding tests, when .praxisjs-ai.json has tests enabled, or when tests of decorated classes fail to run.
---

# Test PraxisJS code

Follow the `praxisjs` skill's rules.

## Setup (once per project)

Decorated classes need the same lowering the Vite plugin applies. Read
`praxisjs_get_page({ page: "tooling/vite-plugin" })` → "Using decorators in Vitest", then check that
the project has it:

```ts
// vitest.config.ts
import { defineConfig } from 'vitest/config'
import { decoratorLoweringPlugin } from '@praxisjs/vite-plugin'

export default defineConfig({
  plugins: [decoratorLoweringPlugin()],
  test: { environment: 'node' },
})
```

Add `vitest` (and `jsdom` for DOM tests) as dev dependencies with the project's package manager, and a
`"test": "vitest run"` script, only if they are missing. Record the testing setup once in
`conventions` (`praxisjs_memory_add`, scope `testing`).

## Where tests go

`praxisjs_scaffold` returns the test path the project uses (`src/__tests__/<name>.test.ts[x]`, or next
to the file when the project colocates tests). Files that touch the DOM start with
`// @vitest-environment jsdom`.

## What to test

| Code | How |
|---|---|
| Component | `render(() => <Comp prop="x" />, container)` from `@praxisjs/runtime` into a detached `div`; assert `container` text/attributes; change state (click, set a field) and assert again; call the returned dispose function at the end |
| Store | instantiate or get it (`store(CartStore)`), call methods, assert fields and derived values |
| Composable | through a small component that composes it, or by calling `setup()`/`onUnmount()` as the docs show |
| Custom decorator | build instances of a decorated class; check values, independence between instances, `onMount`/`onUnmount` cleanup, and the error when misplaced (see `advanced/custom-decorators` → Testing) |
| Async (`@Resource`, `@Task`) | stub `fetch` with `vi.stubGlobal`, `await` the promise, assert loading → data / error states |

Reactive DOM bindings update synchronously after a write. `@Watch` callbacks are coalesced per tick:
`await Promise.resolve()` before asserting their effects. Use fake timers for `@Debounce`/`@Throttle`.

## Coverage

- Every new component, store, composable, decorator and helper gets tests when `.praxisjs-ai.json`
  has `tests: true`; a bug fix gets a test that fails before the fix.
- Cover every branch you wrote: props, state transitions, empty/error states, cleanup.
- Run `npx vitest run --coverage` (with `@vitest/coverage-v8`) on the files you changed and aim for
  100% of their lines and branches unless the project sets other thresholds.
- Run the whole suite before finishing; never weaken or delete a failing test to make it pass.
