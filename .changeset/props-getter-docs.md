---
"@praxisjs/core": patch
---

Document `props` as `StatelessComponent`'s intended public API, and as an internal implementation detail on `StatefulComponent` (use `@Prop()` fields instead). No behavior change — `RootComponent.props`, `StatefulComponent.props`, and `StatelessComponent.props` all still return `_rawProps` exactly as before; this only clarifies, via JSDoc, which class each usage pattern is meant for.
