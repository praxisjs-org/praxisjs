---
"@praxisjs/decorators": major
---

Remove the `accessor`-based APIs: `createAccessorDecorator` (with `AccessorBehavior` and `AccessorBinding`) and the `@Computed({ get, set })` form declared on an `accessor` field. Use `createFieldDecorator` with `setup` on a plain field, and a `@Computed()` getter with a `set` accessor next to it. See the migration notes in "Creating Decorators".

Add a shared `setup` form to `createFieldDecorator`, `createMethodDecorator`, `createGetterDecorator` and `createWritableGetterDecorator`: created once per decorated member, shared by every instance, with per-instance state in symbol slots and optional `init`/`onMount`/`onUnmount`. `ClassBehavior` can define `onMount(instance)`, `onUnmount(instance)` and `render(instance, originalRender)` itself, and `create` is optional. `createGetterObserverDecorator` takes `register` (per mount) and runs a cleanup returned by `observe` on unmount. Every builder takes a `label`, checks the member kind with a clear `TypeError`, and has typed `Host`/`Value` parameters.

The per-instance forms are faster: `createMethodDecorator({ wrap })` and `createWritableGetterDecorator({ bind })` call through one replacement on the class instead of defining a property on every instance (detached `wrap` methods are now bound and stack under built-in method decorators), and `@Computed()` installs its getter on the class. Fixes `@Computed()` with a `set` accessor declared next to the getter, which threw on assignment.
