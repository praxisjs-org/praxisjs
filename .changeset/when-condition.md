---
"@praxisjs/decorators": minor
"create-praxisjs": patch
---

`@When` now accepts an optional condition function.

```ts
// fires the first time score reaches 100
@When('score', score => score >= 100)
onWin() { ... }
```

Pass a predicate as the second argument to `@When(propName, condition?)`. The method fires exactly once — on the first value for which `condition(value)` returns `true`. Without a condition, the existing behaviour is unchanged: the method fires on the first truthy value.

**Internal fix**: `@When` now reads the property inside a reactive `effect()` (the same approach as `@Watch`), so it works correctly with `@State`-decorated fields in addition to raw `Signal`/`Computed` properties.
