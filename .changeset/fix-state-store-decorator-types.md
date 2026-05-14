---
"@praxisjs/decorators": patch
"@praxisjs/store": patch
"create-praxisjs": patch
---

fix: constrain `@State` and `@DeepState` to reactive classes only

Introduces `ReactiveHost` (`{ _stateDirty: boolean }`) exported from `@praxisjs/decorators`. `@State` and `@DeepState` now use `createFieldDecorator<ReactiveHost>` with a generic `<This extends ReactiveHost, Value>` constraint, producing a TS error when applied to plain classes.

`createFieldDecorator` now returns a generic function `<This extends T, Value>` so TypeScript infers the actual class type at the call site and checks the constraint against it instead of doing a fixed structural check.

`@Store` is simplified to a plain class decorator (no longer uses `createClassDecorator`). A new `ReactiveStore` base class is exported from `@praxisjs/store` — store classes must extend it to satisfy the `ReactiveHost` constraint required by `@State` and `@DeepState`. Template updated accordingly.
