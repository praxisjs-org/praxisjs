---
"@praxisjs/motion": minor
---

`@Spring` now throws when `stiffness` is `0` or negative. `@Tween` clamps `duration` to a minimum of `1ms`. Unknown easing names throw an error listing valid options. Errors thrown in `onEnter`/`onLeave` transition callbacks now reject the transition promise instead of going unhandled.
