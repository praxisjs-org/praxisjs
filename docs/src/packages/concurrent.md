# @verbose/concurrent

::: code-group

```sh [npm]
npm install @verbose/concurrent
```

```sh [pnpm]
pnpm add @verbose/concurrent
```

```sh [yarn]
yarn add @verbose/concurrent
```

:::

Concurrency control for async operations. Wraps async functions with reactive loading/error state and execution policies.

## `task<T>(fn)`

Wraps an async function. Multiple concurrent calls are all tracked together. Useful for simple async actions with loading state.

```ts
import { task } from '@verbose/concurrent'

const saveUser = task(async (user: User) => {
  await api.save(user)
  return user
})

// Call it like a normal function
saveUser({ name: 'Alice' })

saveUser.loading.value    // true while any call is pending
saveUser.error.value      // last Error, if any
saveUser.lastResult.value // last resolved value
saveUser.cancelAll()      // abort all in-flight calls
```

| Property | Type | Description |
|----------|------|-------------|
| `loading` | `Computed<boolean>` | Any call in progress |
| `error` | `Computed<Error \| null>` | Last error |
| `lastResult` | `Computed<T \| undefined>` | Last resolved value |
| `cancelAll()` | `() => void` | Cancel all pending calls |

---

## `queue<T>(fn)`

Serial execution queue — calls are buffered and executed one at a time in order.

```ts
import { queue } from '@verbose/concurrent'

const processItem = queue(async (item: Item) => {
  await api.process(item)
})

processItem(item1)
processItem(item2)  // waits for item1 to finish

processItem.loading.value  // true while queue is running
processItem.pending.value  // number of items waiting
processItem.error.value    // last error
processItem.clear()        // discard all queued items
```

| Property | Type | Description |
|----------|------|-------------|
| `loading` | `Computed<boolean>` | Currently executing |
| `pending` | `Computed<number>` | Items waiting in queue |
| `error` | `Computed<Error \| null>` | Last error |
| `clear()` | `() => void` | Clear pending items |

---

## `pool<T>(concurrency, fn)`

Limits the number of concurrent executions. Excess calls wait until a slot opens.

```ts
import { pool } from '@verbose/concurrent'

const uploadFile = pool(3, async (file: File) => {
  await storage.upload(file)
})

// At most 3 uploads run simultaneously
files.forEach(f => uploadFile(f))

uploadFile.loading.value  // true while any is running
uploadFile.active.value   // number currently executing
uploadFile.pending.value  // number waiting for a slot
uploadFile.error.value    // last error
```

| Property | Type | Description |
|----------|------|-------------|
| `loading` | `Computed<boolean>` | Any call running or pending |
| `active` | `Computed<number>` | Calls currently executing |
| `pending` | `Computed<number>` | Calls waiting for a slot |
| `error` | `Computed<Error \| null>` | Last error |

---

## Decorators

Use these on class methods to apply concurrency policies declaratively.

### `@Task()`

```ts
import { Task } from '@verbose/concurrent'

@Component()
class Form extends BaseComponent {
  @Task()
  async submit(data: FormData) {
    await api.post('/submit', data)
  }

  // this.submit_loading, this.submit_error, this.submit_lastResult
}
```

### `@Queue()`

```ts
import { Queue } from '@verbose/concurrent'

@Queue()
async processMessage(msg: Message) {
  await handler.handle(msg)
}
```

### `@Pool(concurrency)`

```ts
import { Pool } from '@verbose/concurrent'

@Pool(4)
async renderThumbnail(image: File) {
  return await imageProcessor.thumbnail(image)
}
```
