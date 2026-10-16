---
"@praxisjs/runtime": minor
"@praxisjs/jsx": minor
"@praxisjs/vite-plugin": minor
---

Add keyed list reconciliation. `For` (keyed by `by`, or by item identity) and `Index` (by position) in `@praxisjs/runtime` render each key once, keep its row while the key stays, and create, move or remove only the rows that changed, with the minimum number of moves (LIS) and `moveBefore()` where available. They support fallbacks, Promise-based enter/leave transitions, hydration of prerendered rows, and isolate row render errors. `@praxisjs/jsx` types components that set `static __jsxRawProps = true` by their exact constructor props, so `For` infers its item type. `@praxisjs/vite-plugin` rewrites keyed `{() => list.map((item) => <Row key={…} />)}` children into `For` and warns about keyed `.map()` calls it cannot rewrite (`keyedLists` option).
