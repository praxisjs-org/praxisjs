---
"@praxisjs/router": patch
---

fix(router): fix infinite recursion in chained `beforeEnter` redirects

When a `beforeEnter` guard returned a string (redirect path), `push()` called itself recursively with no depth limit. A configuration like `A → B → A` would overflow the call stack.

The fix introduces an internal `_redirectDepth` parameter that increments on each redirect. Once the limit of 10 hops is reached, navigation is aborted and a warning is logged to the console.
