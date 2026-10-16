import { getCollector } from "../internal/collector.js";
import { hashCSS } from "../internal/hash.js";
import { declarations } from "../internal/kebab.js";
import { STATIC_MODE } from "../internal/static-mode.js";

import type { CSSProperties } from "./css-builder.js";

type KeyframeStops = Record<string, CSSProperties>;

const injected = new Set<string>();

/** The scoped name and `@keyframes` rule for a set of stops — shared with build-time extraction. */
export function keyframesRule(name: string, stops: KeyframeStops): { name: string; css: string } {
  let body = "";
  for (const stop in stops) {
    const block = `  ${stop} {\n${declarations(stops[stop], "    ")}\n  }`;
    body = body === "" ? block : `${body}\n${block}`;
  }
  const scopedName = `prx-${name}-${hashCSS(body)}`;
  return { name: scopedName, css: `@keyframes ${scopedName} {\n${body}\n}` };
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
  const { name: scopedName, css: kfCSS } = keyframesRule(name, stops);

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
