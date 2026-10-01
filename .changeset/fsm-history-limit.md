---
"@praxisjs/fsm": minor
---

New `historyLimit` option, defaulting to 100: `history` keeps only the most recent transitions (`0` disables it, `Infinity` keeps everything). A machine with more than 100 transitions no longer reports the oldest ones unless `historyLimit: Infinity` is set.
