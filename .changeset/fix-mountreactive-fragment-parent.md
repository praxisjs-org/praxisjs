---
"@praxisjs/runtime": patch
---

Fix `mountReactive` silently dropping DOM updates when the reactive node lives inside a component.

`mountReactive` captured `parent` (the container passed by `mountComponent`, a `DocumentFragment`) by closure. After `mountComponent` returns, the fragment's child nodes are transferred to the actual DOM element — leaving the fragment empty. When a signal change triggered the reactive effect to re-run, `parent.insertBefore(n, end)` failed silently because `end` was no longer a child of the stale `parent` reference.

The fix uses `end.parentNode ?? parent` as the insertion anchor, which always resolves to the live DOM parent after the fragment has been consumed. This affects any reactive expression (`{() => ...}`) returned from a component's `render()` method, including `@Lazy`, `@StateMachine` state-dependent renders, and the `onError` pattern from the docs.
