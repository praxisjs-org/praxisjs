---
"@praxisjs/composables": patch
---

Fix `ElementSize`, `Intersection`, and `Focus` not reacting after mount.

All three composables used `effect()` inside `setup()` to watch `ref.current`. The effect ran during `bind()` (construction time) when the ref was still `null`, and since `ref.current` is a plain object mutation (not a signal write), the effect never re-ran after the DOM was ready.

The fix moves the observer/listener setup to `onMount()`, which fires after the component is inserted into the DOM and ref callbacks have already run — guaranteeing `ref.current` is available.

`ScrollPosition` also updated: now accepts `{ current: HTMLElement | null }` ref objects in addition to `HTMLElement | Window`, making it consistent with the other DOM composables. Listener setup moved to `onMount()` to correctly initialize scroll values.
