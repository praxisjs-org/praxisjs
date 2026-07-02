# @praxisjs/shared

## 0.3.1

### Patch Changes

- 8ab6426: Move component runtime state out of public instances and behind internal helpers.

  BREAKING CHANGE: `RootComponent`, `StatefulComponent`, and `ReactiveStore` no longer expose framework-only underscore internals or `StatefulComponent.props` as public instance API.

  `RootComponent` and `StatefulComponent` no longer expose framework-only underscore fields such as `_rawProps`, `_mounted`, `_anchor`, `_setProps`, `_defaults`, or `_stateDirty`. The renderer, decorators, JSX types, and first-party CSS utilities now use helpers from `@praxisjs/core/internal` to access that state.

  For app code, `StatefulComponent` props should continue to be modeled with `@Prop()` fields. `StatelessComponent<T>` keeps its public `props` getter.

  This also clarifies the intended props API: `StatelessComponent.props` is public, while `StatefulComponent` subclasses should read parent-provided values through `@Prop()` fields instead of `props`.

  `ReactiveStore` now uses a type-only reactive-host marker for `@State`/`@DeepState` compatibility and no longer creates `_stateDirty` on store instances.

## 0.3.0

### Minor Changes

- 80442e0: Add writable computed: `@Computed({ set })`, `@Computed({ get, set })` on `accessor` fields, and `writableComputed()`.

  `@Computed` now accepts an optional `set` function. Assigning to the decorated property calls the setter with the component instance as `this`, letting you write back to the underlying signals while keeping the getter as a reactive cached `computed()`.

  For full TypeScript compatibility without a cast, pass both `get` and `set` to the decorator and declare the field with the `accessor` keyword — TypeScript treats `accessor` fields as read-write.

  `writableComputed(getter, setter)` is also available from `@praxisjs/core/internal` for use in `Composable` patterns that don't use decorators. The `WritableComputed<T>` type is exported from `@praxisjs/shared`.

  ***

  `onError` can now return `Node | Node[] | null` to mount fallback DOM.

  Previously `onError` was `void`-only — it could log or update state, but couldn't directly control what rendered when a component failed.

  `onError(error: Error): Node | Node[] | null | undefined` — if a node or array is returned, the runtime mounts it in place of the failed render output. Return `null` or `undefined` to render nothing (preserves existing behavior).

  ```tsx
  @Component()
  class SafeCard extends StatefulComponent {
    onError(err: Error) {
      return <p class="error-fallback">Failed to load: {err.message}</p>;
    }

    render() {
      return <Card data={this.data} />;
    }
  }
  ```

## 0.2.0

### Minor Changes

- bb0d4f8: **Refactor decorator system and component architecture across PraxisJS packages**
  - Replaced legacy decorator signatures (`constructor`, `target`, `propertyKey`, method descriptor) with the standard TC39 decorator context API (`ClassDecoratorContext`, `ClassFieldDecoratorContext`, `ClassMethodDecoratorContext`) across `@praxisjs/decorators`, `@praxisjs/store`, `@praxisjs/concurrent`, `@praxisjs/router`, `@praxisjs/motion`, `@praxisjs/di`, and `@praxisjs/fsm`.
  - Introduced `StatefulComponent` and `StatelessComponent` as the new base classes, replacing the deprecated `BaseComponent`/`Function Component` pattern, across `@praxisjs/core`, `@praxisjs/runtime`, `@praxisjs/devtools`, and templates.
  - Implemented core rendering functionality in `@praxisjs/runtime` (`mountChildren`, `mountComponent`, reactive scope management) and removed the deprecated `renderer.ts`.
  - Refactored `@praxisjs/jsx` to delegate rendering to `@praxisjs/runtime` and improved type safety with `flattenChildren` and `isComponent` utilities.
  - Updated internal module structure with new `internal` exports in `package.json` files for shared utilities and types.
  - Removed `experimentalDecorators`/`emitDecoratorMetadata` from `tsconfig.json` in favor of native decorator support.

## 0.1.0

### Minor Changes

- aaf7dab: Initial beta release
