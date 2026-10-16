import { getCollector } from "../internal/collector.js";
import { toKebab } from "../internal/kebab.js";

// ─── helpers ──────────────────────────────────────────────────────────────────

/** The `--token: value` pairs of a theme instance's string and number fields. */
export function instanceToVars(instance: Record<string, unknown>): Record<string, string> {
  const result: Record<string, string> = {};
  for (const key of Object.keys(instance)) {
    const val = instance[key];
    if (typeof val === "string" || typeof val === "number") {
      result[`--${toKebab(key)}`] = String(val);
    }
  }
  return result;
}

export function varsToCSS(vars: Record<string, string>): string {
  let body = "";
  for (const name of Object.keys(vars)) {
    const line = `  ${name}: ${vars[name]};`;
    body = body === "" ? line : `${body}\n${line}`;
  }
  return `:root {\n${body}\n}`;
}

function applyVarsToRoot(vars: Record<string, string>): void {
  const col = getCollector();
  if (col) { col.inject("theme", varsToCSS(vars)); return; }

  if (typeof document === "undefined") return;
  let el = document.querySelector<HTMLStyleElement>("style[data-praxis-theme]");
  if (!el) {
    el = document.createElement("style");
    el.setAttribute("data-praxis-theme", "");
    document.head.appendChild(el);
  }
  el.textContent = varsToCSS(vars);
}

// ─── Config ───────────────────────────────────────────────────────────────────

export interface ThemedConfig {
  persist:  boolean;
  syncTabs: boolean;
}

const STORAGE_KEY    = "praxis-theme";
const BROADCAST_KEY  = "praxis-theme";

const destroyed = new WeakSet<ThemeInstance>();

// ─── ThemeInstance ────────────────────────────────────────────────────────────

/**
 * Manages the active design token theme: injects CSS custom properties on
 * `:root`, persists to `localStorage`, and synchronises across browser tabs
 * via `BroadcastChannel`.
 *
 * Obtain the app-wide instance via {@link theme}. Use {@link ThemeInstance.switch}
 * to swap to any class that extends the skeleton `TokenSheet`.
 */
export class ThemeInstance {
  #current: Record<string, unknown>;
  readonly #config: ThemedConfig;
  #channel: BroadcastChannel | null = null;

  constructor(DefaultTheme: new () => unknown, config: Partial<ThemedConfig> = {}) {
    this.#config  = { persist: false, syncTabs: false, ...config };
    this.#current = new DefaultTheme() as Record<string, unknown>;

    const saved = this.#config.persist ? this.#loadFromStorage() : null;

    // Also reaches an active collector when there is no document (server render).
    applyVarsToRoot(saved ?? instanceToVars(this.#current));
    if (this.#config.syncTabs && typeof document !== "undefined") this.#setupBroadcast();
  }

  /** The currently active theme instance. */
  get current(): unknown {
    return this.#current;
  }

  /**
   * Switches the active theme. Instantiates `ThemeClass`, updates `:root` CSS
   * vars, persists to `localStorage` (if `persist` is enabled), and broadcasts
   * to other tabs (if `syncTabs` is enabled).
   */
  switch(ThemeClass: new () => unknown): void {
    this.#current = new ThemeClass() as Record<string, unknown>;
    const vars    = instanceToVars(this.#current);

    applyVarsToRoot(vars);
    if (this.#config.persist)            this.#saveToStorage(vars);
    if (this.#config.syncTabs)           this.#channel?.postMessage({ vars });
  }

  /** Removes the injected `<style>` and closes the BroadcastChannel. */
  destroy(): void {
    destroyed.add(this);
    this.#channel?.close();
    this.#channel = null;
    if (typeof document !== "undefined") {
      document.querySelector("style[data-praxis-theme]")?.remove();
    }
  }

  #saveToStorage(vars: Record<string, string>): void {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(vars)); } catch { /* noop */ }
  }

  #loadFromStorage(): Record<string, string> | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as Record<string, string>) : null;
    } catch { return null; }
  }

  #setupBroadcast(): void {
    if (typeof BroadcastChannel === "undefined") return;
    this.#channel = new BroadcastChannel(BROADCAST_KEY);
    this.#channel.addEventListener(
      "message",
      (e: MessageEvent<{ vars?: Record<string, string> }>) => {
        if (e.data.vars) applyVarsToRoot(e.data.vars);
      },
    );
  }
}

// ─── Singleton ────────────────────────────────────────────────────────────────

let _instance: ThemeInstance | null = null;

export function createThemeInstance(
  DefaultTheme: new () => unknown,
  config?: Partial<ThemedConfig>,
): ThemeInstance {
  // The replaced instance would otherwise keep its BroadcastChannel open for the page lifetime.
  _instance?.destroy();
  _instance = new ThemeInstance(DefaultTheme, config);
  return _instance;
}

/** Whether `instance` is the app-wide theme and has not been destroyed. */
export function isActiveTheme(instance: ThemeInstance | null): boolean {
  return instance !== null && instance === _instance && !destroyed.has(instance);
}

/**
 * Returns the app-wide {@link ThemeInstance}.
 * Throws if `@Themed()` has not been applied to the root component.
 */
export function theme(): ThemeInstance {
  if (!_instance) {
    throw new Error("[PraxisJS] theme() called before @Themed() was applied to the root component.");
  }
  return _instance;
}
