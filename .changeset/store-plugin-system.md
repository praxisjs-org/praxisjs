---
"@praxisjs/store": minor
---

Add plugin system — `useStorePlugin`, `clearPlugins`, and the `StorePlugin` interface. Plugins receive four hooks (`onInit`, `onMutation`, `onAction`, `onActionDone`) and work with both `createStore` (functional API) and class-based `@Storable` stores. The `onInit` hook receives an `extend()` function to add custom properties to every store instance (e.g. `$persist`, `$undo`).
