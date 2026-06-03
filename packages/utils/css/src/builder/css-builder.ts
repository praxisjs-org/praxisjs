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

const CSS_BUILDER = Symbol("css-builder");

export function isCSSBuilder(value: unknown): boolean {
  return typeof value === "object" && value !== null &&
    (value as Record<symbol, unknown>)[CSS_BUILDER] === true;
}

function toKebab(camel: string): string {
  return camel.replace(/([A-Z])/g, "-$1").toLowerCase();
}

function propsToCSS(props: CSSProperties): string {
  return Object.entries(props)
    .filter(([, v]) => v != null)
    .map(([k, v]) => `${toKebab(k)}: ${String(v)};`)
    .join("\n");
}

export function createCSSBuilder(initialProps: CSSProperties): CSSBuilder {
  const parts: string[] = [];
  const rootCSS = propsToCSS(initialProps);
  if (rootCSS) parts.push(rootCSS);

  const addNested = (selector: string, props: CSSProperties): CSSBuilder => {
    const rawCSS = propsToCSS(props);
    if (!rawCSS) return builder;
    const inner = rawCSS.split("\n").map((l) => `  ${l}`).join("\n");
    parts.push(`${selector} {\n${inner}\n}`);
    return builder;
  };

  const toCSS = (): string => parts.join("\n");

  const builder = Object.assign(Object.create(null) as object, {
    [CSS_BUILDER]:        true,
    toString:             toCSS,
    [Symbol.toPrimitive]: toCSS,

    // Pseudo-classes — interaction
    hover:        (p: CSSProperties) => addNested("&:hover", p),
    focus:        (p: CSSProperties) => addNested("&:focus", p),
    focusWithin:  (p: CSSProperties) => addNested("&:focus-within", p),
    focusVisible: (p: CSSProperties) => addNested("&:focus-visible", p),
    active:       (p: CSSProperties) => addNested("&:active", p),
    visited:      (p: CSSProperties) => addNested("&:visited", p),
    target:       (p: CSSProperties) => addNested("&:target", p),

    // Pseudo-classes — form state
    disabled:     (p: CSSProperties) => addNested('&:disabled, &[disabled], &[aria-disabled="true"]', p),
    enabled:      (p: CSSProperties) => addNested("&:enabled", p),
    checked:      (p: CSSProperties) => addNested("&:checked", p),
    indeterminate:(p: CSSProperties) => addNested("&:indeterminate", p),
    required:     (p: CSSProperties) => addNested("&:required", p),
    optional:     (p: CSSProperties) => addNested("&:optional", p),
    valid:        (p: CSSProperties) => addNested("&:valid", p),
    invalid:      (p: CSSProperties) => addNested("&:invalid", p),
    readOnly:     (p: CSSProperties) => addNested("&:read-only", p),

    // Pseudo-classes — structural
    first:        (p: CSSProperties) => addNested("&:first-child", p),
    last:         (p: CSSProperties) => addNested("&:last-child", p),
    nthChild:     (n: string | number, p: CSSProperties) => addNested(`&:nth-child(${String(n)})`, p),
    empty:        (p: CSSProperties) => addNested("&:empty", p),

    // Pseudo-classes — relational (Selectors Level 4)
    has:          (sel: string, p: CSSProperties) => addNested(`&:has(${sel})`, p),
    is:           (sel: string, p: CSSProperties) => addNested(`&:is(${sel})`, p),
    where:        (sel: string, p: CSSProperties) => addNested(`&:where(${sel})`, p),
    not:          (sel: string, p: CSSProperties) => addNested(`&:not(${sel})`, p),

    // Pseudo-elements
    before:       (p: CSSProperties) => addNested("&::before", p),
    after:        (p: CSSProperties) => addNested("&::after", p),
    placeholder:  (p: CSSProperties) => addNested("&::placeholder", p),
    selection:    (p: CSSProperties) => addNested("&::selection", p),
    firstLine:    (p: CSSProperties) => addNested("&::first-line", p),
    firstLetter:  (p: CSSProperties) => addNested("&::first-letter", p),
    marker:       (p: CSSProperties) => addNested("&::marker", p),
    backdrop:     (p: CSSProperties) => addNested("&::backdrop", p),

    // At-rules
    media:        (q: string, p: CSSProperties) => addNested(`@media (${q})`, p),
    container:    (q: string, p: CSSProperties) => addNested(`@container (${q})`, p),
    supports:     (cond: string, p: CSSProperties) => addNested(`@supports (${cond})`, p),
    on:           (sel: string, p: CSSProperties) => addNested(sel, p),
  }) as unknown as CSSBuilder;

  return builder;
}
