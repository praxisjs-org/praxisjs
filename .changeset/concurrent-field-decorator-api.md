---
"@praxisjs/concurrent": minor
---

Redesign `@Task`, `@Queue`, and `@Pool` as field decorators

The decorators now go on a separate field instead of the async method itself. The method name is always the first argument, followed by options. Reactive state is accessed as sub-properties on the field with full TypeScript intellisense via `TaskOf`, `QueueOf`, and `PoolOf` type helpers.

```ts
// Before
@Task()
async loadUser(id: number) { ... }
// this.loadUser_loading() — no intellisense

// After
async loadUser(id: number) { ... }

@Task('loadUser')
taskLoadUser!: TaskOf<MyClass, 'loadUser'>
// this.taskLoadUser.loading()  ✓
// this.taskLoadUser.error()    ✓
```

`@Pool` argument order changed: method name is now first, concurrency second (previously `@Pool(3, 'method')`, now `@Pool('method', 3)`).
