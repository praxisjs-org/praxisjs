---
"@praxisjs/devtools": patch
---

Refactor `@Debug` and `@Trace` internals to use the new decorator factory helpers from `@praxisjs/decorators` (`createFieldDecorator`, `createMethodDecorator`, `createGetterObserverDecorator`, `createClassDecorator`). No changes to public API or behavior.
