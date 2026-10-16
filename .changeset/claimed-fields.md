---
"@praxisjs/decorators": minor
"@praxisjs/vite-plugin": patch
"@praxisjs/di": patch
"@praxisjs/content": patch
"@praxisjs/motion": patch
"@praxisjs/router": patch
"@praxisjs/store": patch
"@praxisjs/fsm": patch
"@praxisjs/css": patch
---

Decorated fields are defined by their innermost decorator. With `@praxisjs/vite-plugin`, `@State()`, `@Prop()`, every built-in field decorator and `createFieldDecorator` bindings install their property directly with the field's initial value instead of replacing a plain value, which kept every instance in V8's slow dictionary mode. New `addClaimableInitializer(context, init)` export for field decorators written against the TC39 API.
