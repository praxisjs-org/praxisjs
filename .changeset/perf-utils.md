---
"@praxisjs/css": patch
"@praxisjs/composables": patch
"@praxisjs/concurrent": patch
---

Faster utils packages and fixes. `@praxisjs/css`: shared per-field state for `@Styled`, `@Param` and `@Style`, a prototype-based `css()` builder, cached token reads and a direct `cx()`. Static extraction now keeps `globalStyle()` layers and supports `preflight()`. Server renders collect theme vars, and instantiating a `@Themed` class keeps the active theme. `@praxisjs/composables`: listeners, observers and timers start on mount. `Idle` and `TimeAgo` no longer reschedule or poll timers, and `FileUpload.clear()` no longer starts discarded uploads. `add()` called from an effect no longer subscribes it to the list. `@praxisjs/concurrent`: cached signal detection, direct signal views, O(1) queues, and `@Pool` no longer subscribes the calling effect.
