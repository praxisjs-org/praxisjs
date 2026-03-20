---
"@praxisjs/decorators": patch
---

Fix three bugs in `Lazy`, `Virtual`, and `Watch` decorators

**`Lazy` / `Virtual` — incompatible type constraint**
Both decorators constrained their generic to `new (...args: any[]) => RootComponent`, where the bare `RootComponent` defaults to `RootComponent<Record<string, never>>`. This made the constraint incompatible with `StatefulComponent`, whose `_rawProps` is typed as `Record<string, unknown>`, causing a TypeScript error at the call site. Changed the constraint to `RootComponent<Record<string, any>>` so any component subclass is accepted.

**`Lazy` — infinite recursion on render after becoming visible**
`_originalRender` was initialized to `this.render.bind(this)`, which at instance-creation time resolves to `LazyWrapper.render` (the override itself). Calling `render()` after the component became visible would then recurse infinitely. Fixed by capturing `constructor.prototype.render` — the parent class's render method — instead.

**`Watch` — reactive effect leaked after component unmount**
The decorator created a reactive `effect()` on `onMount` but never called the returned stop function on unmount. This caused the effect to keep running and the handler to keep firing even after the component was unmounted, resulting in a memory leak and stale callbacks. The decorator now hooks into `onUnmount` to stop the effect and preserves any existing `onUnmount` implementation on the instance.
