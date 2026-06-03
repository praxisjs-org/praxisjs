import { createCSSBuilder, type CSSProperties, type CSSBuilder } from "./builder/css-builder.js";
import { getCollector } from "./internal/collector.js";
import { hashCSS } from "./internal/hash.js";

// ─── Types ────────────────────────────────────────────────────────────────────

/** Factory function that receives `css` (= `createCSSBuilder`) and returns a `CSSBuilder` or raw CSS string. */
export type GlobalStyleFactory = (css: (props: CSSProperties) => CSSBuilder) => CSSBuilder | string;

// ─── Static mode ──────────────────────────────────────────────────────────────

declare const __PRAXIS_CSS_STATIC__: boolean | undefined;
const STATIC_MODE: boolean =
  typeof __PRAXIS_CSS_STATIC__ !== "undefined" && __PRAXIS_CSS_STATIC__;

const injected = new Set<string>();

// ─── globalStyle ─────────────────────────────────────────────────────────────

/**
 * Injects unscoped CSS into `<head>` exactly once.
 *
 * Receives a factory function that is passed `css` — the same builder
 * function as `this.css()` in a `Stylesheet` class — and returns either a
 * {@link CSSBuilder} or a raw CSS string.
 *
 * Use `.on(selector, props)` to attach rules to specific elements.
 * Chain multiple `.on()` calls to produce multiple selectors in one injection.
 *
 * Idempotent — duplicate content is ignored (content-hashed).
 * Safe to call at module level. With the `praxisjsCSS()` Vite plugin the
 * CSS is extracted at build time.
 *
 * @example
 * globalStyle(css =>
 *   css({})
 *     .on('*, *::before, *::after', { boxSizing: 'border-box', margin: 0, padding: 0 })
 *     .on('body', { fontFamily: 'system-ui', lineHeight: 1.5 })
 *     .on('img, video', { display: 'block', maxWidth: '100%' })
 * )
 */
export function globalStyle(factory: GlobalStyleFactory): void {
  const css = String(factory(createCSSBuilder));

  const key = hashCSS(css);
  if (injected.has(key)) return;
  injected.add(key);

  if (STATIC_MODE) return;

  const col = getCollector();
  if (col) { col.inject(key, css); return; }

  if (typeof document === "undefined") return;

  const el = document.createElement("style");
  el.setAttribute("data-praxis-global", key);
  el.textContent = css;
  document.head.appendChild(el);
}
