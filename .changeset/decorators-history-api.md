---
"@praxisjs/decorators": minor
---

Redesign `@History` as a field decorator with `HistoryOf` type helper

`@History` now decorates a separate field (not the `@State` field itself). The first argument is the name of the field to track, the second is the optional limit. Type the field with `HistoryOf<Class, 'field'>` for full intellisense.

`WithHistory` type helper has been removed in favour of `HistoryOf`.

`createFieldDecorator` is now generic and works on any class, not just `StatefulComponent`.

```ts
// Before
@History(100)
@State()
text = ''
// this.textHistory — no intellisense, required interface merging

// After
@State()
text = ''

@History('text', 100)
textHistory!: HistoryOf<MyClass, 'text'>
// this.textHistory.undo()    ✓
// this.textHistory.canUndo() ✓
```
