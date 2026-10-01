---
"@praxisjs/runtime": patch
---

Fix the 0.7.0 regression where an event prop set to `undefined` or `null` threw `Invalid value used as weak map key` and left the component empty. Missing handlers (and `ref`) are ignored; `EventListenerObject` handlers are registered unbatched.
