---
title: Concurrency
description: "@praxisjs/concurrent — async concurrency control decorators @Task, @Queue, and @Pool with reactive loading, error, and pending state exposed as {method}_loading, {method}_error, etc."
---

# Concurrency

Async concurrency decorators from `@praxisjs/concurrent`. Decorate async methods to get reactive loading, error, and result state — automatically scoped per instance.

```sh
npm install @praxisjs/concurrent
```

Each decorator exposes reactive state as separate properties named `{method}_loading`, `{method}_error`, etc.

---

## `@Task()`

Runs calls concurrently. Each call races — if a new call starts before the previous finishes, only the last one updates state.

```tsx
import { Task } from '@praxisjs/concurrent'

@Component()
class UserProfile extends StatefulComponent {
  @State() user: User | null = null

  @Task()
  async loadUser(id: number) {
    this.user = await api.getUser(id)
  }

  render() {
    return (
      <div>
        {() => this.loadUser_loading() && <Spinner />}
        {() => this.loadUser_error() && <p>Error: {this.loadUser_error()!.message}</p>}
        {() => this.user && <UserCard user={this.user} />}
        <button onClick={() => this.loadUser(1)}>Load</button>
      </div>
    )
  }
}
```

Reactive state: `{method}_loading()`, `{method}_error()`, `{method}_lastResult()`

---

## `@Queue()`

Serial execution — calls run one at a time. If a call arrives while one is running, it waits its turn.

```tsx
@Queue()
async saveDocument(data: DocumentData) {
  await api.save(data)
}

render() {
  return (
    <div>
      <button onClick={() => this.saveDocument(data)}>Save</button>
      {() => this.saveDocument_pending() > 0 && (
        <p>{() => this.saveDocument_pending()} saves queued</p>
      )}
    </div>
  )
}
```

Reactive state: `{method}_loading()`, `{method}_error()`, `{method}_pending()`

---

## `@Pool(concurrency)`

Limits how many calls run simultaneously. Excess calls are queued automatically.

```tsx
@Pool(3)
async uploadFile(file: File) {
  await api.upload(file)
}

// At most 3 uploads run at once, others queue up:
onMount() {
  files.forEach(f => this.uploadFile(f))
}

render() {
  return (
    <p>
      Uploading: {() => this.uploadFile_active()} /
      Queued: {() => this.uploadFile_pending()}
    </p>
  )
}
```

Reactive state: `{method}_loading()`, `{method}_error()`, `{method}_active()`, `{method}_pending()`

---

## Reactive state reference

| Property | `@Task` | `@Queue` | `@Pool` | Description |
|---|:-:|:-:|:-:|---|
| `{method}_loading()` | ✓ | ✓ | ✓ | True while any call is in-flight |
| `{method}_error()` | ✓ | ✓ | ✓ | Last error, or `null` |
| `{method}_lastResult()` | ✓ | | | Return value of last successful call |
| `{method}_pending()` | | ✓ | ✓ | Calls waiting in the queue |
| `{method}_active()` | | | ✓ | Calls currently running |

<llm-only>
Concurrency facts:
- @Task, @Queue, @Pool are method decorators from '@praxisjs/concurrent'
- Reactive state is stored as SEPARATE properties on the instance: `this.methodName_loading()`, `this.methodName_error()`, etc. — NOT as `this.methodName.loading()`
- The method itself is called normally: `this.uploadFile(file)` — no .run() wrapper
- @Task cancels stale in-flight calls — if a new call starts before the previous one settles, only the newest updates loading/error/lastResult
- @Queue preserves order — if B arrives while A is running, B is enqueued and runs after A completes
- @Pool(n) allows n concurrent calls; extras are queued. loading() is true when active() > 0
- All reactive state values are Computed<T> signals — call them as functions in JSX arrow functions
</llm-only>
