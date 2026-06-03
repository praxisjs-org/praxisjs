import { getCollector } from "./collector.js";

// ─── Static mode ──────────────────────────────────────────────────────────────

// Defined by the Vite CSS plugin via `define: { __PRAXIS_CSS_STATIC__: true }`.
// When true, CSS is already bundled via virtual:praxisjs/styles — skip DOM injection.
declare const __PRAXIS_CSS_STATIC__: boolean | undefined;

const STATIC_MODE: boolean =
  typeof __PRAXIS_CSS_STATIC__ !== "undefined" && __PRAXIS_CSS_STATIC__;

// ─── DOM registry ─────────────────────────────────────────────────────────────

// WeakRef lets the GC reclaim style elements that were removed externally
// without going through releaseStyle (e.g. framework teardown, test cleanup).
const cssRegistry = new Map<string, { ref: WeakRef<HTMLStyleElement>; count: number }>();

export function injectStyle(key: string, css: string): void {
  if (STATIC_MODE) return;

  const col = getCollector();
  if (col) { col.inject(key, css); return; }

  if (typeof document === "undefined") return;

  const existing = cssRegistry.get(key);
  const existingEl = existing?.ref.deref();

  if (existing && existingEl && document.head.contains(existingEl)) {
    existing.count++;
    return;
  }

  const el = document.createElement("style");
  el.setAttribute("data-praxis-hash", key);
  el.textContent = css;
  document.head.appendChild(el);
  cssRegistry.set(key, { ref: new WeakRef(el), count: 1 });
}

export function releaseStyle(key: string): void {
  if (STATIC_MODE) return;

  const entry = cssRegistry.get(key);
  if (!entry) return;
  entry.count--;
  if (entry.count <= 0) {
    entry.ref.deref()?.remove();
    cssRegistry.delete(key);
  }
}
