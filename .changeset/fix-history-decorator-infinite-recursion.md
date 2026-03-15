---
"@praxisjs/decorators": patch
---

fix(decorators): fix infinite recursion in `@History` decorator `undo()`/`redo()`

`originalUndo` and `originalRedo` were closures that captured `h` by reference. By the time they were called, `h.undo` and `h.redo` had already been overwritten by the augmented versions, creating an infinite cycle that resulted in a stack overflow.

The fix captures the original methods by value using `.bind(h)` (`const _undo = h.undo.bind(h)`) before overwriting them, breaking the cycle and satisfying the `unbound-method` lint rule.
