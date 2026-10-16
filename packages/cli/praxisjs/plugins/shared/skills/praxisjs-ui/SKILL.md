---
name: praxisjs-ui
description: Build PraxisJS UI from Morphos headless primitives (@morphos/*) and Kosmesis copy-paste components (kosmesis CLI) instead of writing them from scratch — find, add, wrap, style and update them. Use before building any button, input, dialog, menu, tabs, table, form control or other UI piece, and when the project has components.json or @morphos/* dependencies.
---

# Morphos primitives and Kosmesis components

Follow the `praxisjs` skill's rules. Morphos (`@morphos/*` on npm) gives accessible, unstyled
behavior (dialogs, menus, tabs, selects…). Kosmesis is a registry of styled components built on
Morphos that its CLI copies into the project, in one of two style systems (Tailwind or
`@praxisjs/css`, fixed in `components.json`).

## 1. Look before building

1. `praxisjs_inspect_project` → "UI libraries": installed `@morphos/*`, Morphos primitives in use,
   Kosmesis setup and installed components (version, outdated, edited).
2. `praxisjs_ui_components({ query: "<what you need>" })`: Kosmesis registry components (the default
   registry plus custom ones in `components.json`) with their dependencies and install status.
3. `praxisjs_memory_check_duplicate({ description })` and `praxisjs_memory_get({ category:
   "conventions", id: "ui-libraries" })` for what the project already decided.
4. Read the docs: `praxisjs_search_docs({ library: "kosmesis" | "morphos", query })`, then
   `praxisjs_get_page({ library, page })` (Kosmesis `components/<name>`, Morphos e.g. `overlays/dialog`).

Preference order: an installed Kosmesis component → a Kosmesis registry component → a Morphos
primitive wrapped in a project component → writing it from scratch (only when none fits; say why in
the memory entry).

## 2. Kosmesis components

- Set up once with `npx kosmesis init` (asks the style system) if `components.json` is missing; ask
  the developer first.
- Add components with the CLI only: `npx kosmesis add <name>` (`@namespace/<name>` for a custom
  registry). Never copy registry files by hand: the CLI installs dependencies and records each file's
  hash in `components.lock.json`.
- They land in the folder `components.json` names (`aliases.ui`, `src/components/ui` by default);
  keep them there.
- Installed components are project code: edit them when the design needs it.
- Before upgrading: `npx kosmesis outdated`, then `npx kosmesis update <name>` (it shows the diff and
  keeps local edits unless confirmed). Never re-add over an edited component.
- Style with the project's style system only (Tailwind classes, or `Stylesheet` + `@Styled` with the
  theme tokens for `@praxisjs/css`); never mix the two.

## 3. Morphos primitives

- Install the right package with `praxisjs_get_install_command({ packages: ["@morphos/overlays"], dev: false })`
  (`@morphos/inputs`, `@morphos/overlays`, `@morphos/layout`, `@morphos/feedback`, `@morphos/icons`).
- Compound components are instantiated once and passed to their parts:
  `@State() dialog = new Dialog()` and `<DialogContent dialog={this.dialog}>` — read the page first.
- Compose or wrap primitives in a project component (in `components/` or `shared/ui/`); never edit
  `@morphos/*` inside `node_modules`.
- Accessibility comes from the primitive: keep its ARIA attributes, keyboard handling and `data-*`
  state attributes (`data-open`, `data-disabled`…); style through those attributes.
- Signatures: `praxisjs_api_reference({ symbol: "Dialog" })` reads the installed Morphos types.

## 4. Record

- New or changed project components built on these → `praxisjs_memory_add` / `praxisjs_memory_update`
  (`components`, tag `kosmesis` for installed Kosmesis ones).
- `praxisjs_memory_map({ record: true })` records installed Kosmesis components and refreshes
  `conventions/ui-libraries` (which primitives and components the project uses).
