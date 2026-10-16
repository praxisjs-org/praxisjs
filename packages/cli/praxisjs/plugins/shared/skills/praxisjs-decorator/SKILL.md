---
name: praxisjs-decorator
description: Create a custom PraxisJS decorator with the current builders (createFieldDecorator, createMethodDecorator, createLifecycleMethodDecorator, createGetterDecorator, createWritableGetterDecorator, createGetterObserverDecorator, createClassDecorator) and its tests. Use when the user wants reusable behavior on fields, methods, getters or component classes.
---

# Create a custom PraxisJS decorator

Follow the `praxisjs` skill's rules. Reference: `../praxisjs/references/extending.md`.

## 1. Make sure it is needed

`praxisjs_memory_check_duplicate({ description })`: PraxisJS ships many decorators (`@Debounce`,
`@Throttle`, `@Once`, `@Retry`, `@Memo`, `@Persisted`, `@Synced`, `@History`, `@Watch`, `@Debug`…)
and the project may have one already. A composable fits better when the logic owns state and a
lifecycle on its own (`praxisjs-composable`).

## 2. Read the docs

`praxisjs_get_page({ page: "advanced/custom-decorators" })`, then
`praxisjs_api_reference({ symbol: "<builder>" })` for the installed signature.

| Target | Builder | Form |
|---|---|---|
| Field with custom get/set | `createFieldDecorator<Host, Value>` | `setup(name, context)` → `{ get, set, init, onMount, onUnmount }` |
| Field another decorator set up | `createFieldDecorator` | `bind(instance, name, initial)` → `{ descriptor }` |
| Method | `createMethodDecorator<Host, M>` | `setup(original, context)` → replacement method, or `{ method, onMount, onUnmount }` |
| Method registered while mounted | `createLifecycleMethodDecorator<Host, Args>` | `register(callback, instance, name)` → undo function |
| Getter value | `createGetterDecorator<Host, Value>` | `setup(original, context)` → replacement getter |
| Writable getter | `createWritableGetterDecorator` | `setup(original, context)` → `{ get, set, init }` |
| Getter side effects | `createGetterObserverDecorator` | `register(getter, instance, name)` → stop function or effect |
| Whole class | `createClassDecorator(new B())`, `B extends ClassBehavior` | `onMount`, `onUnmount`, `render(instance, originalRender)`, `create`, `initialize` |

## 3. Write it

- Plan the file with `praxisjs_scaffold({ kind: "decorator", name })` (the project's decorators folder).
- Prefer `setup`: shared functions, per-instance state in symbol slots created in `init` for every
  instance. No closures created inside a shared `get`/`set`.
- Pass a `label` (`'@Name()'`) and type parameters so misuse fails in the editor.
- **Never use or require the `accessor` keyword**; field decorators throw on it.
- Reactive state: `signal` from `@praxisjs/core/internal` (allowed in decorator code only).
- Usage order: field decorators inner-first (`@Mine() @State() x`), class decorators above `@Component()`.

## 4. Test, validate, record

1. Test with Vitest and `decoratorLoweringPlugin()` (`praxisjs-testing`): instance values, independence
   between instances, `onMount`/`onUnmount` cleanup, and the error when misplaced.
2. `praxisjs_validate_file({ path })` on the decorator and on a class that uses it.
3. `praxisjs_memory_add({ category: "utilities", entry: { kind: "decorator", title, summary, location,
   exports, purpose, api, usage } })`.
