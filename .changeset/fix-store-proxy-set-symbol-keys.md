---
"@praxisjs/store": patch
---

fix(store): fix `TypeError` when assigning symbol keys on the store Proxy

The Proxy `set` trap returned `false` for non-string keys (symbols). In ES modules with strict mode, returning `false` from a `set` trap throws `TypeError: 'set' on proxy: trap returned falsish`. This broke internal JavaScript operations that use symbol keys (e.g. `Symbol.toPrimitive`, `Symbol.iterator`).

The fix returns `true` in those cases, silently ignoring the assignment — the correct behaviour, since the store only manages string keys.
