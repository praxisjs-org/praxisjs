import { declarations } from "../internal/kebab.js";

import type { Properties } from "csstype";

// ─── CSSProperties ────────────────────────────────────────────────────────────

/**
 * Typed CSS property object — backed by `csstype`.
 * All ~300 CSS properties with full value autocomplete.
 * Used as the argument to `this.css({...})` and all nesting methods.
 */
export type CSSProperties = Properties<string | number> & Record<string, string | number | undefined>;

// ─── CSSBuilder ───────────────────────────────────────────────────────────────

/**
 * Fluent CSS builder returned by `this.css({...})`.
 * TypeScript sees it as `string` — works in JSX `class=`, `cx()`, computed keys.
 * Serialises to a CSS rule block via `toString()`.
 *
 * @example
 * class BtnStyles extends Stylesheet {
 *   $base = this.css({ display: 'inline-flex', padding: '8px 16px' })
 *     .hover({ opacity: 0.9 })
 *     .disabled({ opacity: 0.4, pointerEvents: 'none' })
 *     .before({ content: '""', display: 'block' })
 *     .media('max-width: 640px', { width: '100%' })
 * }
 */
export type CSSBuilder = string & {
  // ── Pseudo-classes — interaction ──────────────────────────────────────────
  /** `&:hover { ... }` */
  hover(props: CSSProperties): CSSBuilder;
  /** `&:focus { ... }` */
  focus(props: CSSProperties): CSSBuilder;
  /** `&:focus-within { ... }` */
  focusWithin(props: CSSProperties): CSSBuilder;
  /** `&:focus-visible { ... }` */
  focusVisible(props: CSSProperties): CSSBuilder;
  /** `&:active { ... }` */
  active(props: CSSProperties): CSSBuilder;
  /** `&:visited { ... }` */
  visited(props: CSSProperties): CSSBuilder;
  /** `&:target { ... }` */
  target(props: CSSProperties): CSSBuilder;

  // ── Pseudo-classes — form state ───────────────────────────────────────────
  /** `&:disabled, &[disabled], &[aria-disabled="true"] { ... }` */
  disabled(props: CSSProperties): CSSBuilder;
  /** `&:enabled { ... }` */
  enabled(props: CSSProperties): CSSBuilder;
  /** `&:checked { ... }` */
  checked(props: CSSProperties): CSSBuilder;
  /** `&:indeterminate { ... }` */
  indeterminate(props: CSSProperties): CSSBuilder;
  /** `&:required { ... }` */
  required(props: CSSProperties): CSSBuilder;
  /** `&:optional { ... }` */
  optional(props: CSSProperties): CSSBuilder;
  /** `&:valid { ... }` */
  valid(props: CSSProperties): CSSBuilder;
  /** `&:invalid { ... }` */
  invalid(props: CSSProperties): CSSBuilder;
  /** `&:read-only { ... }` */
  readOnly(props: CSSProperties): CSSBuilder;

  // ── Pseudo-classes — structural ───────────────────────────────────────────
  /** `&:first-child { ... }` */
  first(props: CSSProperties): CSSBuilder;
  /** `&:last-child { ... }` */
  last(props: CSSProperties): CSSBuilder;
  /** `&:nth-child(n) { ... }` */
  nthChild(n: string | number, props: CSSProperties): CSSBuilder;
  /** `&:empty { ... }` */
  empty(props: CSSProperties): CSSBuilder;

  // ── Pseudo-classes — relational (CSS Selectors Level 4) ──────────────────
  /** `&:has(selector) { ... }` */
  has(selector: string, props: CSSProperties): CSSBuilder;
  /** `&:is(...) { ... }` */
  is(selector: string, props: CSSProperties): CSSBuilder;
  /** `&:where(...) { ... }` — zero specificity */
  where(selector: string, props: CSSProperties): CSSBuilder;
  /** `&:not(selector) { ... }` */
  not(selector: string, props: CSSProperties): CSSBuilder;

  // ── Pseudo-elements ───────────────────────────────────────────────────────
  /** `&::before { ... }` */
  before(props: CSSProperties): CSSBuilder;
  /** `&::after { ... }` */
  after(props: CSSProperties): CSSBuilder;
  /** `&::placeholder { ... }` */
  placeholder(props: CSSProperties): CSSBuilder;
  /** `&::selection { ... }` */
  selection(props: CSSProperties): CSSBuilder;
  /** `&::first-line { ... }` */
  firstLine(props: CSSProperties): CSSBuilder;
  /** `&::first-letter { ... }` */
  firstLetter(props: CSSProperties): CSSBuilder;
  /** `&::marker { ... }` */
  marker(props: CSSProperties): CSSBuilder;
  /** `&::backdrop { ... }` */
  backdrop(props: CSSProperties): CSSBuilder;

  // ── At-rules ──────────────────────────────────────────────────────────────
  /** `@media (query) { ... }` */
  media(query: string, props: CSSProperties): CSSBuilder;
  /** `@container (query) { ... }` */
  container(query: string, props: CSSProperties): CSSBuilder;
  /** `@supports (condition) { ... }` */
  supports(condition: string, props: CSSProperties): CSSBuilder;
  /** Any arbitrary nested selector or at-rule. */
  on(selector: string, props: CSSProperties): CSSBuilder;
};

// ─── Runtime ──────────────────────────────────────────────────────────────────

type Props = CSSProperties;

// Every method lives once on the prototype: `this.css()` runs for each `$` field of every
// stylesheet, and a per-builder set of ~40 closures made each call allocate them all.
class CSSBuilderImpl {
  readonly #parts: string[] = [];

  constructor(props: Props) {
    const root = declarations(props, "");
    if (root) this.#parts.push(root);
  }

  #nest(selector: string, props: Props): this {
    const css = declarations(props, "");
    // Indents every line, including the continuation lines of a multi-line value.
    if (css) this.#parts.push(`${selector} {\n  ${css.replaceAll("\n", "\n  ")}\n}`);
    return this;
  }

  toString(): string {
    return this.#parts.join("\n");
  }

  [Symbol.toPrimitive](): string {
    return this.toString();
  }

  // Pseudo-classes — interaction
  hover(p: Props): this { return this.#nest("&:hover", p); }
  focus(p: Props): this { return this.#nest("&:focus", p); }
  focusWithin(p: Props): this { return this.#nest("&:focus-within", p); }
  focusVisible(p: Props): this { return this.#nest("&:focus-visible", p); }
  active(p: Props): this { return this.#nest("&:active", p); }
  visited(p: Props): this { return this.#nest("&:visited", p); }
  target(p: Props): this { return this.#nest("&:target", p); }

  // Pseudo-classes — form state
  disabled(p: Props): this { return this.#nest('&:disabled, &[disabled], &[aria-disabled="true"]', p); }
  enabled(p: Props): this { return this.#nest("&:enabled", p); }
  checked(p: Props): this { return this.#nest("&:checked", p); }
  indeterminate(p: Props): this { return this.#nest("&:indeterminate", p); }
  required(p: Props): this { return this.#nest("&:required", p); }
  optional(p: Props): this { return this.#nest("&:optional", p); }
  valid(p: Props): this { return this.#nest("&:valid", p); }
  invalid(p: Props): this { return this.#nest("&:invalid", p); }
  readOnly(p: Props): this { return this.#nest("&:read-only", p); }

  // Pseudo-classes — structural
  first(p: Props): this { return this.#nest("&:first-child", p); }
  last(p: Props): this { return this.#nest("&:last-child", p); }
  nthChild(n: string | number, p: Props): this { return this.#nest(`&:nth-child(${String(n)})`, p); }
  empty(p: Props): this { return this.#nest("&:empty", p); }

  // Pseudo-classes — relational (Selectors Level 4)
  has(sel: string, p: Props): this { return this.#nest(`&:has(${sel})`, p); }
  is(sel: string, p: Props): this { return this.#nest(`&:is(${sel})`, p); }
  where(sel: string, p: Props): this { return this.#nest(`&:where(${sel})`, p); }
  not(sel: string, p: Props): this { return this.#nest(`&:not(${sel})`, p); }

  // Pseudo-elements
  before(p: Props): this { return this.#nest("&::before", p); }
  after(p: Props): this { return this.#nest("&::after", p); }
  placeholder(p: Props): this { return this.#nest("&::placeholder", p); }
  selection(p: Props): this { return this.#nest("&::selection", p); }
  firstLine(p: Props): this { return this.#nest("&::first-line", p); }
  firstLetter(p: Props): this { return this.#nest("&::first-letter", p); }
  marker(p: Props): this { return this.#nest("&::marker", p); }
  backdrop(p: Props): this { return this.#nest("&::backdrop", p); }

  // At-rules
  media(q: string, p: Props): this { return this.#nest(`@media (${q})`, p); }
  container(q: string, p: Props): this { return this.#nest(`@container (${q})`, p); }
  supports(cond: string, p: Props): this { return this.#nest(`@supports (${cond})`, p); }
  on(sel: string, p: Props): this { return this.#nest(sel, p); }
}

export function isCSSBuilder(value: unknown): boolean {
  return value instanceof CSSBuilderImpl;
}

export function createCSSBuilder(initialProps: CSSProperties): CSSBuilder {
  return new CSSBuilderImpl(initialProps) as unknown as CSSBuilder;
}
