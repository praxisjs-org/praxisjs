---
"@praxisjs/devtools": patch
---

fix(devtools): guard against undefined `entry` in `TimelineRow`

`entry` is typed as `TimelineEntry | undefined`, but `render()` accessed `entry.data` unconditionally, which would throw at runtime when no entry is provided. Added an early `null` return guard and a local `const entry = this.entry` binding that also fixes bare `entry` references in JSX that were missing the `this.` prefix.
