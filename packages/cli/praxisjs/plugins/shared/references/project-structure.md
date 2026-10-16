# Project structure

A file's location is part of the project's design. **Follow the structure the project already has**
(and what the project memory records under `conventions`); never create a file in an ad-hoc place.
The two layouts below are examples, not requirements: propose one only for a new project, or when the
developer asks to reorganize.

## Where things go

The project's own rule is `conventions/project-structure` in the project memory
(`praxisjs_memory_get({ category: "conventions", id: "project-structure" })`). `praxisjs_scaffold`
applies it and returns the path for a new file; it recognizes both layouts below.

## Example: by kind (the `create-praxisjs` templates)

```
src/
  main.tsx          render(() => <App />, …)
  app.tsx           root component (@Router table when routed)
  pages/            routed components, one per route
  components/       reusable UI components (components/ui/ for Kosmesis components)
  stores/           @Storable stores (the templates start with a single src/store.ts)
  composables/      Composable classes
  services/         @Injectable services
  decorators/       custom decorators
  utils/            plain helpers
  styles/           stylesheets, design tokens
  __tests__/        tests, mirroring the file they test (unless the project keeps tests next to the code)
```

## Example: feature slices

For larger apps, each feature owns its UI, state and routes:

```
src/
  app/                    bootstrap, root component, router, global providers
  features/
    cart/
      components/         cart-view.tsx, cart-line.tsx
      stores/             cart-store.ts
      composables/
      services/           cart-api.ts
      routes.ts           the feature's routes
      index.ts            the feature's public API: what other code may import
      __tests__/
    catalog/
      …
  shared/
    ui/                   installed Kosmesis components, wrappers around Morphos primitives
    lib/                  helpers, custom decorators
    config/
    types/
```

The rules that make it work (`praxisjs_validate_file` checks the first two):

- Features import each other only through the other feature's `index.ts` (`@/features/cart`), never
  a deep path (`@/features/cart/stores/cart-store`).
- `shared/` never imports from `features/`; code two features need moves to `shared/`.
- No deep imports across slices; tests and styles sit with the feature they belong to.
- `praxisjs_scaffold({ kind, name, feature })` places files in the feature (or in `shared/` without
  one); a new feature starts with its `index.ts`.

## Common rules

- File names are kebab-case and named after the main export: `UserCard` → `user-card.tsx`.
- One component per file; a component's private stylesheet may live in the same file.
- `.tsx` only for files that contain JSX.
- Kosmesis components stay in the folder `components.json` names (`aliases.ui`).

## Disorganized code

When a task touches code in the wrong place (a store inside a page file, helpers in a component
folder, two folders for the same kind, a deep import across features):

1. Point it out and propose where it belongs, citing `conventions/project-structure`.
2. Small, local moves (one or two files the task already changes): do them, update the imports, run
   `praxisjs_validate_file` and the tests.
3. Larger moves (several files, public paths, many imports, switching layouts): ask the developer
   first, then move in one focused change, separate from feature work.
4. Afterwards run `praxisjs_memory_map` and update the `location` of every entry it reports as moved;
   record the agreed layout with `praxisjs_memory_update` on `conventions/project-structure`.
