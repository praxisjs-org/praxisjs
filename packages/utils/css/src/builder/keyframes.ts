import { getCollector } from "../internal/collector.js";
import { hashCSS } from "../internal/hash.js";

import type { CSSProperties } from "./css-builder.js";

// Defined by the Vite CSS plugin — skip DOM injection when CSS is static.
declare const __PRAXIS_CSS_STATIC__: boolean | undefined;
const STATIC_MODE: boolean =
  typeof __PRAXIS_CSS_STATIC__ !== "undefined" && __PRAXIS_CSS_STATIC__;

type KeyframeStops = Record<string, CSSProperties>;

const injected = new Set<string>();

function toKebab(camel: string): string {
  return camel.replace(/([A-Z])/g, "-$1").toLowerCase();
}

function stopToCSS(props: CSSProperties): string {
  return Object.entries(props)
    .filter(([, v]) => v != null)
    .map(([k, v]) => `    ${toKebab(k)}: ${String(v)};`)
    .join("\n");
}

/**
 * Defines a scoped `@keyframes` animation and injects it into `document.head`.
 * Returns the scoped animation name — use it in the `animation` or
 * `animationName` property of a stylesheet field.
 *
 * The name is content-hashed so two identical animations share one injection.
 * Safe to call at module level (outside components).
 *
 * @example
 * const pulse = keyframes('pulse', {
 *   from: { opacity: 1 },
 *   to:   { opacity: 0.4 },
 * })
 *
 * class LoaderStyles extends Stylesheet {
 *   $spinner = this.css({ animation: `${pulse} 1.2s ease-in-out infinite` })
 * }
 */
export function keyframes(name: string, stops: KeyframeStops): string {
  const stopsCSS = Object.entries(stops)
    .map(([stop, props]) => `  ${stop} {\n${stopToCSS(props)}\n  }`)
    .join("\n");

  const scopedName = `prx-${name}-${hashCSS(stopsCSS)}`;
  const kfCSS = `@keyframes ${scopedName} {\n${stopsCSS}\n}`;

  if (STATIC_MODE) return scopedName;

  const col = getCollector();
  if (col) { col.addKeyframes(scopedName, kfCSS); return scopedName; }

  if (!injected.has(scopedName) && typeof document !== "undefined") {
    const el = document.createElement("style");
    el.setAttribute("data-praxis-keyframes", scopedName);
    el.textContent = kfCSS;
    document.head.appendChild(el);
    injected.add(scopedName);
  }

  return scopedName;
}
