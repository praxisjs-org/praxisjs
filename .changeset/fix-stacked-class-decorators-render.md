---
"@praxisjs/decorators": patch
---

Fix stacked class decorators (e.g. `@Lazy @Component`) re-entering the outermost enhancement's render recursively.

When two `createClassDecorator`-based decorators are stacked, the inner one's `originalRender` closure called the outer Enhanced class's `render()`, which checked `this._enh.render` on the instance — always the outermost decorator's enhancement. This caused the outermost render enhancement to be called again instead of the user's actual render, returning a nested thunk that `normalizeToNodes` could not handle (functions are not Nodes → silently dropped).

The fix tracks instances currently inside an `originalRender` call via a module-level `WeakSet`. When a render is invoked as `originalRender` from within an enhancement, the `this._enh.render` dispatch is skipped and the constructor's render is called directly, breaking the re-entry cycle.
