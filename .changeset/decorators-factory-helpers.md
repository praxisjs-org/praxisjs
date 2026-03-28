---
"@praxisjs/decorators": minor
---

Add decorator factory helpers and new built-in decorators.

**Decorator factories** — low-level building blocks for authoring custom decorators:
- `createFieldDecorator` / `FieldBehavior` / `FieldBinding`
- `createClassDecorator` / `ClassBehavior` / `ClassEnhancement`
- `createMethodDecorator` / `MethodBehavior`
- `createLifecycleMethodDecorator` / `LifecycleMethodBehavior`
- `createGetterDecorator` / `GetterBehavior`
- `createGetterObserverDecorator` / `GetterObserverBehavior`

**New built-in decorators:**
- `@Compose` — mixes a `Composable` class into a component, binding its reactive properties and lifecycle hooks
- `@Resource` — declares an async resource on a component field, replacing the standalone `resource()` function from `@praxisjs/core`
