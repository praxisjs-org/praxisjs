---
"@praxisjs/motion": patch
---

Fix `@Tween` animation restarting on every frame instead of completing.

The `start()` helper inside `tween()` read `_value()` while executing inside the reactive `effect()` body. This accidentally subscribed the effect to the value signal, so every frame update (`_value.set(...)`) re-triggered the effect, which called `start()` again — resetting `startTime` and restarting the animation from the current intermediate value indefinitely.

Fixed by wrapping the `_value()` read with `untrack()` so it does not register as a dependency of the effect.
