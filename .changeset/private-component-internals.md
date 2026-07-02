---
"@praxisjs/core": major
"@praxisjs/shared": patch
"@praxisjs/decorators": patch
"@praxisjs/runtime": patch
"@praxisjs/jsx": patch
"@praxisjs/css": patch
"@praxisjs/store": major
---

Move component runtime state out of public instances and behind internal helpers.

BREAKING CHANGE: `RootComponent`, `StatefulComponent`, and `ReactiveStore` no longer expose framework-only underscore internals or `StatefulComponent.props` as public instance API.

`RootComponent` and `StatefulComponent` no longer expose framework-only underscore fields such as `_rawProps`, `_mounted`, `_anchor`, `_setProps`, `_defaults`, or `_stateDirty`. The renderer, decorators, JSX types, and first-party CSS utilities now use helpers from `@praxisjs/core/internal` to access that state.

For app code, `StatefulComponent` props should continue to be modeled with `@Prop()` fields. `StatelessComponent<T>` keeps its public `props` getter.

This also clarifies the intended props API: `StatelessComponent.props` is public, while `StatefulComponent` subclasses should read parent-provided values through `@Prop()` fields instead of `props`.

`ReactiveStore` now uses a type-only reactive-host marker for `@State`/`@DeepState` compatibility and no longer creates `_stateDirty` on store instances.
