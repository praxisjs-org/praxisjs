// ─── camelCase → --kebab-case ─────────────────────────────────────────────────

function camelToKebab(s: string): string {
  return s.replace(/([A-Z])/g, "-$1").toLowerCase();
}

// ─── Static props that must never be intercepted ──────────────────────────────

const SKIP = new Set([
  "length", "name", "prototype", "constructor",
  "toString", "valueOf", "toLocaleString",
  "hasOwnProperty", "isPrototypeOf", "propertyIsEnumerable",
  "call", "apply", "bind", "caller", "arguments",
  "__esModule", "then", "catch", "finally",
]);

// ─── TokenSheet ───────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-extraneous-class
const _Base = class {};

/**
 * Base class for token skeletons and theme value classes.
 *
 * Extend to declare token names (skeleton) or token values (theme).
 * Static property access returns CSS custom property references at any level
 * of the inheritance chain: `AppTokens.colorPrimary` → `'var(--color-primary)'`.
 *
 * @example — skeleton (names only)
 * class AppTokens extends TokenSheet {
 *   colorPrimary!: string
 *   spaceMd!:      string
 * }
 *
 * @example — theme (values)
 * class LightTheme extends AppTokens {
 *   colorPrimary = '#3b82f6'
 *   spaceMd      = '16px'
 * }
 *
 * class DarkTheme extends LightTheme {
 *   colorPrimary = '#60a5fa'  // only overrides what changes
 * }
 */
export const TokenSheet = new Proxy(_Base, {
  get(target, prop, receiver) {
    if (
      typeof prop === "string" &&
      !SKIP.has(prop) &&
      !prop.startsWith("_") &&
      !prop.startsWith("$")
    ) {
      return `var(--${camelToKebab(prop)})`;
    }
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return Reflect.get(target, prop, receiver);
  },
}) as unknown as abstract new (...args: unknown[]) => object;

// ─── tokenVars ────────────────────────────────────────────────────────────────

/**
 * Returns a typed accessor for CSS custom property references derived from a
 * {@link TokenSheet} subclass. Each key returns `'var(--token-name)'`.
 *
 * Use this in `Stylesheet` definitions to get full TypeScript autocomplete
 * without casts.
 *
 * @example
 * const t = tokenVars(AppTokens)
 * // t.colorPrimary → 'var(--color-primary)'
 * // t.spaceMd      → 'var(--space-md)'
 *
 * class BtnStyles extends Stylesheet {
 *   $root = this.css({ background: t.colorPrimary, padding: t.spaceMd })
 * }
 */
type TokenVarMap<T extends abstract new (...args: unknown[]) => unknown> = {
  readonly [K in keyof InstanceType<T> as K extends string ? K : never]: string;
};

export function tokenVars<T extends abstract new (...args: unknown[]) => unknown>(
  cls: T,
): TokenVarMap<T> {
  return cls as unknown as TokenVarMap<T>;
}
