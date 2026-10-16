---
name: praxisjs-component
description: Create or change a PraxisJS component (StatefulComponent or StatelessComponent, @State/@Prop, styles, test) placed where the project keeps components. Use when the user asks for a new component, page, widget, form, card, modal or any UI piece in a PraxisJS project.
---

# Create a PraxisJS component

Follow the `praxisjs` skill's rules; this is the component workflow. All `praxisjs_*` tools come from
the PraxisJS MCP server (`../praxisjs/references/mcp.md`).

## 1. Reuse first

1. `praxisjs_memory_check_duplicate({ description: "<what it shows/does>", name: "<Name>" })`.
   PraxisJS components (`For`, `Index`, `Portal`, `Link`, `RouterView`), a recorded component or one in
   the code may already do it: use or extend it.
2. UI pieces (buttons, inputs, dialogs, menus, tabs, tables…): check Kosmesis
   (`praxisjs_ui_components({ query })`, installed or in the registry) and Morphos primitives first,
   following the `praxisjs-ui` skill. Prefer adding a Kosmesis component with `npx kosmesis add` or
   wrapping a Morphos primitive over writing one.
3. `praxisjs_memory_search` for the feature's business rules and conventions; respect them.

## 2. Plan the file

`praxisjs_scaffold({ kind: "component" | "page", name, stateful, route, feature })` returns the path (from
`conventions/project-structure`), starter code, the test file and the docs to read. Read them:
`essentials/components`, `decorators/state`, `essentials/reactivity`, plus `essentials/lists` for
lists and `ecosystem/router` for pages.

Choose the type:

| Has | Type |
|---|---|
| Only props, no state, no watchers/events/slots | `StatelessComponent<Props>`, props read through `this.props` |
| `@State`, `@Prop`, `@Watch`, `@Emit`, `@Slot`, `@Resource`, composables | `StatefulComponent`, props as `@Prop()` fields, no `this.props` |

## 3. Write it

- `@Component()` is the innermost class decorator; `render()` is required.
- `render()` runs once: anything that must update goes in an arrow, `{() => this.count}`,
  `class={() => …}`. A plain `{this.count}` is a snapshot.
- Lists: `<For each={() => this.items} by="id">{(item) => …}</For>` (or `Index`), never a full
  `.map()` re-render; per-row selection with `@Selector`.
- Assign new arrays/objects to `@State` fields (`this.items = [...this.items, x]`); mutate in place
  only with `@DeepState()`.
- Async data with `@Resource`, timing with `@Debounce`/`@Throttle`, DOM/browser state with
  `@Compose(...)` composables: look them up before hand-rolling.
- Styles as the project does (`.praxisjs-ai.json` → `css`): with `@praxisjs/css`, a `Stylesheet` class
  and `@Styled(Sheet) $s!: Sheet` (`ReactiveStylesheet` with `@Param()` only on `StatefulComponent`).
- UI strings in `uiLocale`, identifiers/comments in `codeLocale`; with `i18n: true`, no hardcoded strings.
- Never the `accessor` keyword; no `any`; `!` only on decorated field declarations.

## 4. Check and record

1. `praxisjs_validate_file({ path })` until it reports no errors; review each warning.
2. Write the test (`praxisjs-testing` skill) when `.praxisjs-ai.json` has `tests: true`.
3. Reusable component → `praxisjs_memory_add({ category: "components", entry: { title, summary,
   location, exports, purpose, api, usage } })`. Pages are not recorded as components.
4. Changed an existing recorded component's props → `praxisjs_memory_update`.
