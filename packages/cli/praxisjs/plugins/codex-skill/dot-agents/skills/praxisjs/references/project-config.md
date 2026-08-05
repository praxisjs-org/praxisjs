# Project Config — `.praxisjs-ai.json`

Stores developer preferences at the project root. Created once during the init flow; read silently at the start of every subsequent session.

---

## Full schema

```jsonc
{
  "version": 1,

  // Write tests for every new component and behavior?
  "tests": true,

  // Language for identifiers, comments, and variable names
  // Examples: "en", "pt", "es", "fr", "de"
  "codeLocale": "en",

  // Language for user-facing strings in templates and UI
  // Examples: "en", "pt-BR", "es", "fr-FR"
  "uiLocale": "en",

  // Set up i18n (internationalization) support?
  "i18n": false,

  // Styling approach: "praxisjs-css" | "plain" | "modules" | "tailwind" | "unocss" | "none"
  "css": "plain"
}
```

---

## Option reference

### `tests`

| Value | Behavior |
|---|---|
| `true` | Every new component gets a sibling test file in `src/__tests__/`. Every new `@Watch` handler, `@Resource` field, or stateful behavior gets at least one test. |
| `false` | No test files are generated. Tests can still be requested explicitly. |

Test files follow the project convention: `src/__tests__/ComponentName.test.ts`. Tests run on Vitest; the environment defaults to `node`, so add `// @vitest-environment jsdom` as the first line of any file that touches `document`, `localStorage`, or other DOM APIs.

---

### `codeLocale`

Controls the language used for:
- Class and variable names (`UserProfile` vs `PerfilUsuario`)
- Method names (`handleSubmit` vs `handleEnvio`)
- Inline comments
- Error messages thrown in logic code

Examples:

```ts
// codeLocale: "en"
@State() isLoading = false
private handleSubmit() { ... }

// codeLocale: "pt"
@State() carregando = false
private handleEnviar() { ... }
```

Does not affect user-visible strings in templates (that is `uiLocale`).

---

### `uiLocale`

Controls the language used for:
- All text content in JSX templates
- Button labels, headings, placeholders
- Error messages shown to users
- `aria-label` and accessibility attributes

Examples:

```tsx
// uiLocale: "en"
<button>Save changes</button>
<input placeholder="Search…" />

// uiLocale: "pt-BR"
<button>Salvar alterações</button>
<input placeholder="Pesquisar…" />
```

When `i18n` is `true`, this value is the default/fallback locale passed to the i18n setup — see the i18n section below.

---

### `i18n`

| Value | Behavior |
|---|---|
| `false` | Strings are written directly in templates using `uiLocale`. |
| `true` | Use the i18n pattern below. Never hardcode strings in templates. |

#### i18n pattern (when `i18n: true`)

PraxisJS ships no i18n package — this is an application-level pattern built on a store. Fetch `praxisjs_get_page('ecosystem/store')` and `praxisjs_get_page('essentials/jsx')` to confirm the current store and reactive-binding APIs before implementing.

General approach:
1. Strings live in locale files: `src/locales/en.ts`, `src/locales/pt-BR.ts`, etc.
2. A store holds the active locale and exposes a `t(key)` lookup; reading `this.locale` inside `t` makes every call site reactive
3. Templates use `{() => t('key')}` — reactive, so switching locale updates the DOM without remounting

```ts
// src/locales/en.ts
export const en = {
  nav: { home: 'Home', about: 'About' },
  actions: { save: 'Save', cancel: 'Cancel' },
}

// src/locales/pt-BR.ts
export const ptBR = {
  nav: { home: 'Início', about: 'Sobre' },
  actions: { save: 'Salvar', cancel: 'Cancelar' },
}
```

```ts
// src/stores/i18n.ts
import { State } from '@praxisjs/decorators'
import { Storable, ReactiveStore } from '@praxisjs/store'

@Storable()
export class I18nStore extends ReactiveStore {
  @State() locale: 'en' | 'pt-BR' = 'en'

  t(key: string): string { /* resolve key against the active locale */ }
}
```

```tsx
// In a component — reactive locale key lookup
@Store(I18nStore) i18n!: I18nStore

render() {
  return <button>{() => this.i18n.t('actions.save')}</button>
}
```

Add `i18n: true` and the active locale to `AGENTS.md` under **Known constraints** so future sessions know strings must never be hardcoded.

---

### `css`

| Value | Behavior |
|---|---|
| `"praxisjs-css"` | Use `@praxisjs/css`. Define a stylesheet class per component: `Stylesheet` for plain scoped class fields (`$root = this.css({...})`), or `ReactiveStylesheet` when the component also needs `@Param()` reactive CSS custom properties — `ReactiveStylesheet` only attaches to a `StatefulComponent`. Inject it with `@Styled(MyStyles) $s!: MyStyles`. Fetch `css` first, then `css/stylesheets` and `css/builder` for the fluent API, `css/reactive` for `@Param`/`@Style`, and `css/tokens` for design tokens. The API is easy to get subtly wrong from memory. |
| `"plain"` | Add styles in a plain `.css` file imported at the top of the component file. Scope with a root class name matching the component. |
| `"modules"` | Use `import styles from './ComponentName.module.css'` and reference `styles.className` in JSX. |
| `"tailwind"` | Apply Tailwind utility classes directly in JSX. No separate CSS file unless strictly necessary. |
| `"unocss"` | Apply UnoCSS utility classes directly in JSX (same pattern as Tailwind). |
| `"none"` | Write no CSS. Provide component structure and logic only; the developer handles all styling. |

When `css` is `"praxisjs-css"`, check whether the project also registers `praxisjsCSS()` in `vite.config.ts` — that plugin extracts all stylesheet rules at build time so no `<style>` tags are injected at runtime. See `tooling/vite-plugin`.

---

## Updating the config

If the developer wants to change a preference after init, they can:
- Edit `.praxisjs-ai.json` manually, or
- Ask Codex: "update my praxisjs config — enable i18n"

When a preference changes, update `AGENTS.md` if the change affects architecture (e.g. switching `i18n` from false to true, or changing `css` from `plain` to `modules`).

---

## Example configs

### Minimal English project, no tests

```json
{
  "version": 1,
  "tests": false,
  "codeLocale": "en",
  "uiLocale": "en",
  "i18n": false,
  "css": "plain"
}
```

### Brazilian Portuguese project with Tailwind and i18n

```json
{
  "version": 1,
  "tests": true,
  "codeLocale": "pt",
  "uiLocale": "pt-BR",
  "i18n": true,
  "css": "tailwind"
}
```

### English codebase, Spanish UI, UnoCSS

```json
{
  "version": 1,
  "tests": true,
  "codeLocale": "en",
  "uiLocale": "es",
  "i18n": false,
  "css": "unocss"
}
```
