---
"@praxisjs/decorators": minor
"@praxisjs/core": minor
"@praxisjs/devtools": patch
"create-praxisjs": patch
---

Add `@Computed()` decorator to `@praxisjs/decorators` for declaring read-only reactive getters backed by a cached `computed()` signal. The getter recomputes automatically when any `@State` or `@Prop` dependency changes, and the result is cached until a dependency is invalidated — unlike a plain getter which recalculates on every read.

`@Debug()` in `@praxisjs/devtools` now supports `@Computed()` getters (`ClassGetterDecoratorContext`) in addition to fields and methods, allowing computed values to be tracked and historized in the devtools panel.

Also fixes a bug in the `computed()` primitive where an erroneous `track(recompute)` call caused premature dependency tracking on signal creation.
