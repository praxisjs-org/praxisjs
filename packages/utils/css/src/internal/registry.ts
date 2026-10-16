import { getCollector } from "./collector.js";
import { STATIC_MODE } from "./static-mode.js";

const elements = new Map<string, HTMLStyleElement>();

/**
 * Makes sure the stylesheet `key` is present: collected while a collector is active (server
 * render), appended once to `document.head` otherwise, and appended again if its element was
 * removed from the document. Idempotent, so it is cheap to call for every component instance.
 */
export function injectStyle(key: string, css: string): void {
  if (STATIC_MODE) return;

  const col = getCollector();
  if (col) { col.inject(key, css); return; }

  if (typeof document === "undefined") return;
  if (elements.get(key)?.isConnected) return;

  const el = document.createElement("style");
  el.setAttribute("data-praxis-hash", key);
  el.textContent = css;
  document.head.appendChild(el);
  elements.set(key, el);
}
