import { Stylesheet, ReactiveStylesheet } from "./base/stylesheet.js";
import { createCSSBuilder, type CSSProperties } from "./builder/css-builder.js";
import { keyframesRule } from "./builder/keyframes.js";
import { globalCSS, type GlobalStyleFactory, type GlobalStyleOptions } from "./global.js";
import { hashCSS } from "./internal/hash.js";
import { compileSheet } from "./internal/sheet.js";
import { preflightCSS, type PreflightOptions } from "./preflight.js";
import { instanceToVars, varsToCSS } from "./tokens/theme-instance.js";
import { TokenSheet, tokenVars } from "./tokens/token-sheet.js";

// ─── Types ────────────────────────────────────────────────────────────────────

export type EmitFn = (css: string, prepend?: boolean) => void;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Ctor = new (...args: any[]) => unknown;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function themeToRootCSS(ThemeClass: Ctor): string | null {
  try {
    const vars = instanceToVars(new ThemeClass() as Record<string, unknown>);
    return Object.keys(vars).length > 0 ? varsToCSS(vars) : null;
  } catch {
    return null;
  }
}

function collectSheetCSS(SheetClass: Ctor, emit: EmitFn): void {
  try {
    const { css } = compileSheet(SheetClass);
    if (css) emit(css);
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
      const rule = keyframesRule(name, stops);
      dedupEmit(rule.css);
      return rule.name;
    },
    globalStyle: (factory: GlobalStyleFactory, options?: GlobalStyleOptions) => {
      dedupEmit(globalCSS(factory, options));
    },
    preflight: (options?: PreflightOptions) => {
      dedupEmit(preflightCSS(options));
    },
  };
}
