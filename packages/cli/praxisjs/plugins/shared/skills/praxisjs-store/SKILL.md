---
name: praxisjs-store
description: Create or change shared state in a PraxisJS app with @praxisjs/store (@Storable stores, @Store injection, store plugins) and, for services, @praxisjs/di. Use when state must be shared across components or pages, or the user asks for a store, global state or a service.
---

# Create a PraxisJS store

Follow the `praxisjs` skill's rules.

## 1. Decide

- State used by one component stays in that component (`@State`).
- State shared across the app goes in a store. Check first:
  `praxisjs_memory_check_duplicate({ description: "<what the state is>" })` and
  `praxisjs_memory_search({ query, category: "utilities" })`: extend an existing store for the same
  domain instead of adding a second one.
- Stateless logic shared by components (API clients) is a service: `@Injectable()` + `@Inject()`
  (`ecosystem/di`).
- Install `@praxisjs/store` / `@praxisjs/di` through `praxisjs_get_install_command({ …, dev: false })`.

## 2. Read the docs

`praxisjs_get_page({ page: "ecosystem/store" })` (and `ecosystem/di` for services).

## 3. Write it

- `praxisjs_scaffold({ kind: "store", name })` gives the path.
- `@Storable() class CartStore extends ReactiveStore` with `@State()` fields and methods that assign
  new values (`this.items = [...this.items, item]`).
- Components read it with `@Store(CartStore) cart!: CartStore` and `{() => this.cart.total}`; code
  outside components uses `store(CartStore)`.
- Cross-cutting behavior for every store (persistence, logging) is a store plugin registered once with
  `useStorePlugin({ name, onInit, onMutation, onAction, onActionDone })`, not code copied into stores.
- Business rules the store enforces (limits, invariants) go in the project memory (`business-rules`).

## 4. Test, validate, record

Test the store's methods and derived values (`praxisjs-testing`), run `praxisjs_validate_file`, then
`praxisjs_memory_add({ category: "utilities", entry: { kind: "store", … } })`. A new state-management
decision (first store, store-per-domain) is an `architecture` entry.
