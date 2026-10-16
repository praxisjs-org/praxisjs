# Extending PraxisJS

When nothing built in fits (check with `praxisjs_memory_check_duplicate` and `praxisjs_search_docs`
first), build on the same extension points the framework uses. They stack with the built-ins, survive
HMR and hydration, and keep instances fast. Don't monkeypatch prototypes, wrap components in ad-hoc
base classes, or subscribe by hand in every component instead.

Read the docs page before writing one: `advanced/custom-decorators`, `advanced/custom-composables`,
`ecosystem/store` (plugins), `tooling/devtools-plugins`. Check signatures with `praxisjs_api_reference`.

## Which extension point

| You want to… | Use (all from `@praxisjs/decorators` unless noted) |
|---|---|
| Give a field custom reactive get/set behavior | `createFieldDecorator({ label, setup })` |
| Wrap a field another decorator set up (`@Trimmed() @State() x`) | `createFieldDecorator({ bind })` |
| Wrap a method (confirm, log, guard, timing) | `createMethodDecorator({ label, setup })` |
| Register a method on mount and undo it on unmount | `createLifecycleMethodDecorator({ register })` |
| Change what a getter returns | `createGetterDecorator({ setup })` |
| Make a getter writable, the decorator handling writes | `createWritableGetterDecorator({ setup })` |
| React to a getter without changing it | `createGetterObserverDecorator({ register })` |
| Mount/unmount behavior or wrap `render()` for a whole class | `createClassDecorator(new MyBehavior())`, `MyBehavior extends ClassBehavior` |
| Reusable reactive logic with its own state (DOM API, subscription) | `class X extends Composable` (`@praxisjs/core`), attached with `@Compose(X)` |
| Hook into every store (persistence, logging, undo) | `useStorePlugin({ name, onInit, onMutation, onAction, onActionDone })` (`@praxisjs/store`) |
| A devtools tab | a `DevtoolsPlugin` object (`{ id, label, setup?, component }`) passed to `DevTools.init({ plugins })` or `DevTools.registerPlugin()` (`@praxisjs/devtools`) |
| Shared field setup for decorators written against the TC39 API | `assertFieldContext`, `addClaimableInitializer` |

## Rules

- **Prefer the `setup` form.** It runs once per decorated member; what it returns is shared by every
  instance (`this` is the instance) and per-instance state lives in symbol slots created in `init`.
  Use `bind` / `wrap` only when the decorator needs something only an instance has.
- **Never use the `accessor` keyword.** Field decorators (built-in and custom) throw a `TypeError` on
  `accessor` fields, and there is no accessor builder: decorate plain fields.
- Give every decorator a `label` (`'@SessionValue()'`): errors name it.
- Field decorators apply inner-first: `@State()` / `@Prop()` closest to the field, observers above.
  Class decorators apply bottom-up: `@Component()` innermost, custom class decorators above it.
- Decorator and composable implementations may import `signal`, `computed`, `effect`, `batch` from
  `@praxisjs/core/internal`; application code never does.
- Type the builders (`createFieldDecorator<Host, Value>`, `createMethodDecorator<Host, M>`,
  `createGetterDecorator<Host, Value>`, `createLifecycleMethodDecorator<Host, Args>`) so misplaced
  decorators fail in the editor.
- Test it like the docs show (instances built in Vitest with `decoratorLoweringPlugin()`), place it in
  the decorators/composables folder, and record it in the project memory (`utilities`, kind
  `decorator` / `composable`).
