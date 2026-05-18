---
"@praxisjs/router": minor
---

**Breaking:** `@RouterConfig` → `@Router`; `@InjectRouter()` merged into `@Router()` (dual-purpose field/class decorator); `Router` class → `RouterInstance`.

Add layout system: `layout?` on `RouteDefinition`, automatic layout inheritance via `children`, `<RouterOutlet>` component, `@InjectLayout()` field decorator, and `RouterInstance.currentLayout` signal.

Implement `@Router` with `createClassDecorator` + `ClassBehavior` (`RouterBehavior.create()` re-activates the correct router per instantiation, fixing singleton conflicts when multiple `@Router` classes share module scope).

Fix concurrent navigation: `_navSeq` counter ensures the latest `push()` always wins — stale in-flight resolutions are discarded.
