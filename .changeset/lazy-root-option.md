---
"@praxisjs/decorators": minor
---

**Fix `@Lazy` never rendering the component after intersection.** The `render` enhancement was returning a static `null`, which PraxisJS evaluated once inside `untrack()` — `visible()` never created a reactive subscription, so `visible.set(true)` from the IntersectionObserver had no effect. The enhancement now returns a reactive thunk `() => visible() ? render() : null` so the runtime tracks the signal and re-evaluates when intersection fires.

`@Lazy` now also accepts an options object in addition to the plain number shorthand, adding `root` and `rootMargin` options for scoping intersection to a specific scroll container.

```tsx
// before (still works)
@Lazy(300)
@Component()
class HeavyChart extends StatefulComponent { ... }

// new — scope to a scrollable container
const scrollRoot = { current: null as HTMLDivElement | null }

@Lazy({ placeholder: 300, root: scrollRoot, rootMargin: '0px' })
@Component()
class HeavyChart extends StatefulComponent { ... }

// in render:
<div ref={(el) => { scrollRoot.current = el }} style="overflow-y:auto;height:400px">
  <HeavyChart />
</div>
```

`root` accepts `{ current: HTMLElement | null }` (a ref object). When `root.current` is `null` at mount time, falls back to the viewport. `rootMargin` defaults to `"100px"`.
