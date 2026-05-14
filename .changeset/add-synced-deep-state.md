---
"@praxisjs/core": minor
"@praxisjs/decorators": minor
"create-praxisjs": patch
---

Add `@Synced` decorator and `@DeepState` decorator.

`@Synced(channelName?)` syncs a signal across browser tabs in real-time via `BroadcastChannel`. Writes in any tab are broadcast to all other open tabs automatically. The channel name defaults to the field name. The underlying `syncedSignal` primitive is also exported from `@praxisjs/core` for direct use.

`@DeepState()` wraps an object or array in a deep `Proxy` so nested mutations (`this.config.theme.mode = 'dark'`, `this.items.push(x)`) are reactive without needing to create new references. It is an opt-in complement to `@State`, which requires immutable updates. Reactivity is coarse-grained: any nested mutation re-runs all effects that read the field.
