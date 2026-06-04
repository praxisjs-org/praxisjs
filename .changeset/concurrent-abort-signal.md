---
"@praxisjs/concurrent": minor
---

Add opt-in `AbortSignal` support to `@Task`, `@Queue`, and `@Pool`.

Name the first parameter of your async method `signal` to receive a live `AbortSignal`. The decorator detects the parameter name and injects it automatically — callers are unaffected. Methods without a `signal` parameter continue to work exactly as before.

```ts
// opt-in — declare signal as first param
async loadUser(signal: AbortSignal, id: number) {
  return fetch(`/api/users/${id}`, { signal }).then(r => r.json())
}

// unchanged — no signal, no change in behavior
async saveDoc(data: DocumentData) {
  return api.save(data)
}
```

Changes per primitive:

- **`@Task`** — each new invocation aborts the previous signal; `cancelAll()` also aborts the active signal. `AbortError` is not stored in `.error()`.
- **`@Queue`** — `clear()` now also aborts the currently running call's signal in addition to cancelling pending items.
- **`@Pool`** — new `cancelAll()` method; aborts all active signals and resolves all pending calls as `undefined`.
- `QueueClearedError` is now exported from the package root.
