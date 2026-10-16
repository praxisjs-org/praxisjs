---
"@praxisjs/devtools": minor
"@praxisjs/core": minor
"@praxisjs/runtime": patch
---

DevTools: a Performance panel and `profiler` that record signal writes, effect runs and computed recomputations with their cost, grouped by the component that created each effect; `@Debug({ log, break })`, reactive observation of accessor fields (props included), promise-aware method timing, `@Trace({ slow })`, inert decorators in production builds, and a faster registry. Core exposes the observer hooks the profiler uses (`setReactiveObserver`, `setCurrentOwner`, `getEffectOwner` in `@praxisjs/core/internal`), which cost one null check while no observer is installed; the runtime marks the rendering component as the owner of the effects it creates.
