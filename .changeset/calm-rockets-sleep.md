---
"@praxisjs/di": patch
"create-praxisjs": patch
---

Refactor `@Injectable` and `@Scope` to use `ClassBehavior` / `createClassDecorator` from `@praxisjs/decorators`. Simplify `Container.instantiate` to plain `new target()`, removing the internal TC39 metadata maps (`constructorDepsMap`, `propDepsMap`) and the associated `setConstructorDeps` / `setPropDep` helpers.
