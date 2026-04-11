---
title: Concurrency
description: "@praxisjs/concurrent — async concurrency control decorators @Task, @Queue, and @Pool with reactive loading, error, and pending state exposed as sub-properties on the decorated field."
---

# Concurrency

Async concurrency decorators from `@praxisjs/concurrent`. Decorate async methods to get reactive loading, error, and result state — automatically scoped per instance.

::: code-group

```sh [npm]
npm install @praxisjs/concurrent
```

```sh [pnpm]
pnpm add @praxisjs/concurrent
```

```sh [yarn]
yarn add @praxisjs/concurrent
```

```sh [bun]
bun add @praxisjs/concurrent
```

:::

Each decorator goes on a separate field. The first argument is always the method name, followed by any options. Type the field with the matching `TaskOf` / `QueueOf` / `PoolOf` helper for full intellisense.

---

## Pattern

```tsx
import { Task, TaskOf } from '@praxisjs/concurrent'

@Component()
class UserProfile extends StatefulComponent {
  @State() user: User | null = null

  async loadUser(id: number) {
    this.user = await api.getUser(id)
  }

  @Task('loadUser')
  taskLoadUser!: TaskOf<UserProfile, 'loadUser'>
  // taskLoadUser(1)           — call it
  // taskLoadUser.loading()    — reactive boolean
  // taskLoadUser.error()      — reactive Error | null
  // taskLoadUser.lastResult() — reactive last return value
}
```

---

## `@Task(methodName)`

Runs calls concurrently. Each call races — if a new call starts before the previous finishes, only the last one updates state.

```tsx
import { Task, TaskOf } from '@praxisjs/concurrent'

@Component()
class UserProfile extends StatefulComponent {
  @State() user: User | null = null

  async loadUser(id: number) {
    this.user = await api.getUser(id)
  }

  @Task('loadUser')
  taskLoadUser!: TaskOf<UserProfile, 'loadUser'>

  render() {
    return (
      <div>
        {() => this.taskLoadUser.loading() && <Spinner />}
        {() => this.taskLoadUser.error() && <p>Error: {this.taskLoadUser.error()!.message}</p>}
        {() => this.user && <UserCard user={this.user} />}
        <button onClick={() => this.taskLoadUser(1)}>Load</button>
      </div>
    )
  }
}
```

Reactive state: `.loading()`, `.error()`, `.lastResult()`, `.cancelAll()`

---

## `@Queue(methodName)`

Serial execution — calls run one at a time. If a call arrives while one is running, it waits its turn.

```tsx
import { Queue, QueueOf } from '@praxisjs/concurrent'

@Component()
class DocumentEditor extends StatefulComponent {
  async saveDocument(data: DocumentData) {
    await api.save(data)
  }

  @Queue('saveDocument')
  taskSaveDocument!: QueueOf<DocumentEditor, 'saveDocument'>

  render() {
    return (
      <div>
        <button onClick={() => this.taskSaveDocument(data)}>Save</button>
        {() => this.taskSaveDocument.pending() > 0 && (
          <p>{() => this.taskSaveDocument.pending()} saves queued</p>
        )}
      </div>
    )
  }
}
```

Reactive state: `.loading()`, `.error()`, `.pending()`, `.clear()`

### Clearing the queue

`.clear()` cancels all queued (not-yet-started) calls. Each cancelled call's promise rejects with a `QueueClearedError`.

```tsx
import { QueueClearedError } from '@praxisjs/concurrent'

onUnmount() {
  this.taskSaveDocument.clear()
}

async saveAll() {
  try {
    await this.taskSaveDocument(data)
  } catch (e) {
    if (e instanceof QueueClearedError) return  // expected — ignore
    throw e
  }
}
```

---

## `@Pool(methodName, concurrency?)`

Limits how many calls run simultaneously. Excess calls are queued automatically. `concurrency` defaults to `1`.

```tsx
import { Pool, PoolOf } from '@praxisjs/concurrent'

@Component()
class FileUploader extends StatefulComponent {
  async uploadFile(file: File) {
    await api.upload(file)
  }

  @Pool('uploadFile', 3)
  taskUploadFile!: PoolOf<FileUploader, 'uploadFile'>

  onMount() {
    files.forEach(f => this.taskUploadFile(f))
  }

  render() {
    return (
      <p>
        Uploading: {() => this.taskUploadFile.active()} /
        Queued: {() => this.taskUploadFile.pending()}
      </p>
    )
  }
}
```

Reactive state: `.loading()`, `.error()`, `.active()`, `.pending()`

---

## Reactive state reference

| Property | `@Task` | `@Queue` | `@Pool` | Description |
|---|:-:|:-:|:-:|---|
| `.loading()` | ✓ | ✓ | ✓ | True while any call is in-flight |
| `.error()` | ✓ | ✓ | ✓ | Last error, or `null` |
| `.lastResult()` | ✓ | | | Return value of last successful call |
| `.pending()` | | ✓ | ✓ | Calls waiting in the queue |
| `.active()` | | | ✓ | Calls currently running |
| `.clear()` | | ✓ | | Cancels all queued calls with `QueueClearedError` |
| `.cancelAll()` | ✓ | | | Discards in-flight result (does not abort the promise) |

## Type helpers

| Helper | Usage |
|---|---|
| `TaskOf<Class, 'method'>` | Type for a `@Task` field |
| `QueueOf<Class, 'method'>` | Type for a `@Queue` field |
| `PoolOf<Class, 'method'>` | Type for a `@Pool` field |

<llm-only>
Concurrency facts:
- @Task, @Queue, @Pool are decorators from '@praxisjs/concurrent'
- The pattern is: define the async method normally, then add a decorated field that references it by name
- @Task('methodName') decorates a field typed as TaskOf<ClassName, 'methodName'>
- @Queue('methodName') decorates a field typed as QueueOf<ClassName, 'methodName'>
- @Pool('methodName', concurrency?) decorates a field typed as PoolOf<ClassName, 'methodName'> — method name is FIRST, concurrency is second (optional, defaults to 1)
- Reactive state is accessed as sub-properties on the field: this.taskLoad.loading(), this.taskLoad.error(), etc.
- The field is called directly to invoke the task: this.taskLoad(id)
- @Task cancels stale in-flight calls — only the last call updates loading/error/lastResult
- @Queue preserves order — calls run one at a time in the order they were made
- @Queue exposes .clear() — rejects all queued (not-yet-started) calls with QueueClearedError
- QueueClearedError is exported from '@praxisjs/concurrent'
- @Pool('method', n) allows n concurrent calls; extras are queued. loading() is true when active() > 0. concurrency is clamped to minimum 1.
- All reactive state values are Computed<T> signals — call them as functions in JSX arrow functions
- TaskOf, QueueOf, PoolOf are type helpers exported from '@praxisjs/concurrent'
Never hardcode package versions in package.json. Always install packages using @latest (e.g. `npm install @praxisjs/core@latest`) so the user gets the current release.
</llm-only>
