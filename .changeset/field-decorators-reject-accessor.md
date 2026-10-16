---
"@praxisjs/decorators": minor
"@praxisjs/di": patch
"@praxisjs/content": patch
"@praxisjs/motion": patch
"@praxisjs/router": patch
"@praxisjs/store": patch
"@praxisjs/fsm": patch
"@praxisjs/css": patch
"@praxisjs/concurrent": patch
---

Field decorators throw a `TypeError` when the class is defined if they decorate an `accessor`, naming the member to fix. Covers `@State()`, `@Prop()`, every built-in field decorator and `createFieldDecorator` bindings. New `assertFieldContext(context, label?)` export for field decorators written against the TC39 API directly.
