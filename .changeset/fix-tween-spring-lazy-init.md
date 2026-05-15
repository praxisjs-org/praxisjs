---
"@praxisjs/motion": patch
---

Fix `@Tween` and `@Spring` not animating when read in a reactive JSX expression before the first assignment.

Previously both decorators created the tween/spring lazily on first `set()`. If the field was read inside a `{() => this.value}` expression before any write, the getter returned the fallback `0` without subscribing to the tween's signal — so the DOM effect never re-ran when the animation progressed.

Both decorators now initialize eagerly in `bind()` using the field's initial value, so any reactive read immediately subscribes to the animated signal and updates correctly from the first frame.
