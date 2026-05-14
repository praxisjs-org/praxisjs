---
"@praxisjs/decorators": minor
---

Add `@Synced` and `@DeepState` decorators. Fix `@Virtual` scroll handler.

`@Synced(channelName?)` syncs a decorated field across browser tabs via `BroadcastChannel`. The channel name defaults to the field name.

`@DeepState()` wraps an object or array in a deep `Proxy` so nested mutations (`this.config.theme.mode = 'dark'`, `this.items.push(x)`) trigger reactivity without needing to replace the reference.

`@Virtual` — the scroll handler now captures the container reference at mount time (`const currentContainer = container`) instead of a conditional guard inside the callback.
