import { Stylesheet, ReactiveStylesheet } from "./base/stylesheet.js";
import { isCSSBuilder, createCSSBuilder, type CSSProperties } from "./builder/css-builder.js";
import { hashCSS } from "./internal/hash.js";
import { TokenSheet, tokenVars } from "./tokens/token-sheet.js";

// ─── Types ────────────────────────────────────────────────────────────────────

export type EmitFn = (css: string, prepend?: boolean) => void;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Ctor = new (...args: any[]) => unknown;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function camelToKebab(s: string): string {
  return s.replace(/([A-Z])/g, "-$1").toLowerCase();
}

function themeToRootCSS(ThemeClass: Ctor): string | null {
  try {
    const inst = new ThemeClass() as Record<string, unknown>;
    const vars = Object.entries(inst)
      .filter(([, v]) => typeof v === "string" || typeof v === "number")
      .map(([k, v]) => `  --${camelToKebab(k)}: ${String(v)};`)
      .join("\n");
    return vars ? `:root {\n${vars}\n}` : null;
  } catch {
    return null;
  }
}

function collectSheetCSS(SheetClass: Ctor, emit: EmitFn): void {
  try {
    const inst = new SheetClass() as Record<string, unknown>;
    const blocks: string[] = [];
    for (const [k, v] of Object.entries(inst)) {
      if (!k.startsWith("$")) continue;
      const css = typeof v === "string" ? v : (isCSSBuilder(v) ? String(v) : null);
      if (!css) continue;
      const name = k.slice(1).replace(/[^\w-]/g, "-");
      blocks.push(`.prx-${name}-${hashCSS(css)} { ${css.trim()} }`);
    }
    if (blocks.length) emit(blocks.join("\n"));
  } catch { /* skip sheets that can't be instantiated at build time */ }
}

// ─── Module factory ───────────────────────────────────────────────────────────

/**
 * Creates the `@praxisjs/css` module API surface for build-time CSS extraction.
 *
 * All CSS-generating calls route through `emit` instead of the DOM.
 * Pass the returned object as the `@praxisjs/css` entry in a vm sandbox's
 * `require()` handler.
 *
 * @example
 * const mod = extractionModule((css, prepend) => { ... })
 * sandbox.require = id => id === '@praxisjs/css' ? mod : {}
 */
export function extractionModule(emit: EmitFn): Record<string, unknown> {
  const seen = new Set<string>();

  const dedupEmit: EmitFn = (css, prepend) => {
    const key = hashCSS(css);
    if (seen.has(key)) return;
    seen.add(key);
    emit(css, prepend);
  };

  class ExtractionThemeInstance {
    constructor(DefaultTheme: Ctor) {
      const css = themeToRootCSS(DefaultTheme);
      if (css) dedupEmit(css, true);
    }
    get current() { return {}; }
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    switch(_T: Ctor) {}
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    destroy() {}
  }

  return {
    __esModule: true,

    // Base classes — real implementations, used by user's `extends Stylesheet`
    Stylesheet,
    ReactiveStylesheet,
    createCSSBuilder,

    // Token system — real implementations. `TokenSheet` is a Proxy that
    // resolves any static property access (even through subclass prototype
    // chains) to `var(--kebab-case)`, so token-derived CSS values resolve
    // correctly during build-time extraction without needing an instance.
    TokenSheet,
    tokenVars,
    ThemeInstance: ExtractionThemeInstance,
    // eslint-disable-next-line @typescript-eslint/no-extraneous-class
    theme: () => new ExtractionThemeInstance(class {}),
    createThemeInstance: (T: Ctor) => new ExtractionThemeInstance(T),
    Themed: (_skeleton: unknown, DefaultTheme: Ctor) => {
      const css = themeToRootCSS(DefaultTheme);
      if (css) dedupEmit(css, true);
      return (cls: unknown) => cls;
    },
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    Theme: () => () => {},

    // CSS API — collect instead of inject
    Styled: (SheetClass: Ctor) => {
      collectSheetCSS(SheetClass, dedupEmit);
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      return () => {};
    },
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    Param:  () => () => {},
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    Style:  () => () => {},
    cx:     () => "",
    keyframes: (name: string, stops: Record<string, CSSProperties>) => {
      const stopToCSS = (p: CSSProperties) =>
        Object.entries(p)
          .filter(([, v]) => v != null)
          .map(([k, v]) => `    ${camelToKebab(k)}: ${String(v)};`)
          .join("\n");
      const body = Object.entries(stops)
        .map(([s, p]) => `  ${s} {\n${stopToCSS(p)}\n  }`)
        .join("\n");
      const sn = `prx-${name}-${hashCSS(body)}`;
      dedupEmit(`@keyframes ${sn} {\n${body}\n}`);
      return sn;
    },
    globalStyle: (factory: (css: typeof createCSSBuilder) => unknown) => {
      dedupEmit(String(factory(createCSSBuilder)));
    },
  };
}
