import { describe, it, expect } from "vitest";
import { extractionModule } from "../extract";
import { Stylesheet, ReactiveStylesheet } from "../base/stylesheet";
import { createCSSBuilder } from "../builder/css-builder";

// ─── Helpers ──────────────────────────────────────────────────────────────────

type Mod = ReturnType<typeof extractionModule>;

function makeCollector() {
  const emitted: Array<{ css: string; prepend?: boolean }> = [];
  const mod = extractionModule((css, prepend) => emitted.push({ css, prepend }));
  return { mod, emitted };
}

// ─── API shape ────────────────────────────────────────────────────────────────

describe("extractionModule() — API shape", () => {
  it("returns an object with __esModule: true", () => {
    const mod = extractionModule(() => {});
    expect(mod.__esModule).toBe(true);
  });

  it("Stylesheet is the real base class — subclasses can use this.css()", () => {
    const { mod } = makeCollector();
    const S = (mod as Mod & { Stylesheet: typeof Stylesheet }).Stylesheet;
    expect(S).toBe(Stylesheet);
    class BtnStyles extends S {
      $base = this.css({ display: "flex" });
    }
    expect(new BtnStyles()).toBeInstanceOf(S);
  });

  it("ReactiveStylesheet is the real base class", () => {
    const { mod } = makeCollector();
    const RS = (mod as Mod & { ReactiveStylesheet: typeof ReactiveStylesheet }).ReactiveStylesheet;
    expect(RS).toBe(ReactiveStylesheet);
  });

  it("createCSSBuilder is the real function", () => {
    const { mod } = makeCollector();
    expect(mod.createCSSBuilder).toBe(createCSSBuilder);
  });

  it("cx() returns an empty string", () => {
    const { mod } = makeCollector();
    expect((mod.cx as () => string)()).toBe("");
  });

  it("Param() returns a decorator function", () => {
    const { mod } = makeCollector();
    const result = (mod.Param as () => unknown)();
    expect(typeof result).toBe("function");
  });

  it("Style() returns a decorator function", () => {
    const { mod } = makeCollector();
    const result = (mod.Style as () => unknown)();
    expect(typeof result).toBe("function");
  });

  it("Theme() returns a decorator function", () => {
    const { mod } = makeCollector();
    const result = (mod.Theme as () => unknown)();
    expect(typeof result).toBe("function");
  });

  it("tokenVars() returns its argument unchanged", () => {
    const { mod } = makeCollector();
    const cls = class {};
    expect((mod.tokenVars as (c: unknown) => unknown)(cls)).toBe(cls);
  });

  it("TokenSheet is a class (can be instantiated)", () => {
    const { mod } = makeCollector();
    const TS = mod.TokenSheet as new () => unknown;
    expect(new TS()).toBeDefined();
  });
});

// ─── Styled() ─────────────────────────────────────────────────────────────────

describe("extractionModule() — Styled()", () => {
  it("collects scoped CSS for each $-prefixed field", () => {
    const { mod, emitted } = makeCollector();
    const S = (mod as Mod & { Stylesheet: typeof Stylesheet }).Stylesheet;
    const Styled = mod.Styled as (cls: new () => unknown) => unknown;

    class CardStyles extends S {
      $root  = this.css({ display: "flex", gap: "8px" });
      $title = this.css({ fontSize: "1rem", fontWeight: 600 });
    }

    Styled(CardStyles);
    expect(emitted).toHaveLength(1);
    expect(emitted[0].css).toContain(".prx-root-");
    expect(emitted[0].css).toContain(".prx-title-");
    expect(emitted[0].css).toContain("display: flex");
    expect(emitted[0].css).toContain("font-size: 1rem");
  });

  it("returns a decorator function", () => {
    const { mod } = makeCollector();
    const result = (mod.Styled as (cls: new () => unknown) => unknown)(class {});
    expect(typeof result).toBe("function");
  });

  it("deduplicates identical sheets — emits only once", () => {
    const { mod, emitted } = makeCollector();
    const S = (mod as Mod & { Stylesheet: typeof Stylesheet }).Stylesheet;
    const Styled = mod.Styled as (cls: new () => unknown) => unknown;
    class BtnStyles extends S { $base = this.css({ display: "flex" }); }

    Styled(BtnStyles);
    Styled(BtnStyles);
    expect(emitted).toHaveLength(1);
  });

  it("ignores fields that don't start with '$'", () => {
    const { mod, emitted } = makeCollector();
    const S = (mod as Mod & { Stylesheet: typeof Stylesheet }).Stylesheet;
    const Styled = mod.Styled as (cls: new () => unknown) => unknown;
    class MixedStyles extends S {
      hidden = "ignored";
      $visible = this.css({ color: "red" });
    }
    Styled(MixedStyles);
    expect(emitted[0].css).not.toContain("ignored");
    expect(emitted[0].css).toContain("color: red");
  });

  it("ignores $-prefixed fields that are neither strings nor builders", () => {
    const { mod, emitted } = makeCollector();
    const S = (mod as Mod & { Stylesheet: typeof Stylesheet }).Stylesheet;
    const Styled = mod.Styled as (cls: new () => unknown) => unknown;
    class WeirdStyles extends S {
      $valid = this.css({ display: "flex" });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      $invalid = 42 as any;
    }
    Styled(WeirdStyles);
    expect(emitted[0].css).not.toContain("42");
    expect(emitted[0].css).toContain("display: flex");
  });

  it("handles $-prefixed string fields (raw CSS string)", () => {
    const { mod, emitted } = makeCollector();
    const S = (mod as Mod & { Stylesheet: typeof Stylesheet }).Stylesheet;
    const Styled = mod.Styled as (cls: new () => unknown) => unknown;
    class RawStyles extends S {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      $custom = "color: red; font-size: 14px;" as any;
    }
    Styled(RawStyles);
    expect(emitted[0].css).toContain("color: red");
  });

  it("emits nothing if the sheet has no $-prefixed fields", () => {
    const { mod, emitted } = makeCollector();
    const S = (mod as Mod & { Stylesheet: typeof Stylesheet }).Stylesheet;
    const Styled = mod.Styled as (cls: new () => unknown) => unknown;
    class EmptyStyles extends S {}
    Styled(EmptyStyles);
    expect(emitted).toHaveLength(0);
  });

  it("silently skips sheets whose constructor throws", () => {
    const { mod, emitted } = makeCollector();
    const Styled = mod.Styled as (cls: new () => unknown) => unknown;
    class BadStyles {
      constructor() { throw new Error("oops"); }
    }
    expect(() => Styled(BadStyles)).not.toThrow();
    expect(emitted).toHaveLength(0);
  });
});

// ─── keyframes() ─────────────────────────────────────────────────────────────

describe("extractionModule() — keyframes()", () => {
  it("calls emit with an @keyframes block", () => {
    const { mod, emitted } = makeCollector();
    const kf = mod.keyframes as (n: string, s: Record<string, object>) => string;
    kf("pulse", { from: { opacity: 1 }, to: { opacity: 0.4 } });
    expect(emitted).toHaveLength(1);
    expect(emitted[0].css).toContain("@keyframes prx-pulse-");
    expect(emitted[0].css).toContain("opacity: 1;");
    expect(emitted[0].css).toContain("opacity: 0.4;");
  });

  it("returns the scoped animation name", () => {
    const { mod } = makeCollector();
    const kf = mod.keyframes as (n: string, s: Record<string, object>) => string;
    const name = kf("spin", { from: { transform: "rotate(0deg)" }, to: { transform: "rotate(360deg)" } });
    expect(name).toMatch(/^prx-spin-/);
  });

  it("deduplicates identical keyframes", () => {
    const { mod, emitted } = makeCollector();
    const kf = mod.keyframes as (n: string, s: Record<string, object>) => string;
    const stops = { from: { opacity: 0 }, to: { opacity: 1 } };
    kf("fade", stops);
    kf("fade", stops);
    expect(emitted).toHaveLength(1);
  });

  it("converts camelCase properties to kebab-case", () => {
    const { mod, emitted } = makeCollector();
    const kf = mod.keyframes as (n: string, s: Record<string, object>) => string;
    kf("move", { from: { marginTop: "0px" }, to: { marginTop: "20px" } });
    expect(emitted[0].css).toContain("margin-top:");
  });
});

// ─── globalStyle() ───────────────────────────────────────────────────────────

describe("extractionModule() — globalStyle()", () => {
  type GSFactory = (factory: (_css: unknown) => string) => void;

  it("calls emit with the CSS returned by the factory", () => {
    const { mod, emitted } = makeCollector();
    (mod.globalStyle as GSFactory)(_css => "body { margin: 0; }");
    expect(emitted).toHaveLength(1);
    expect(emitted[0].css).toBe("body { margin: 0; }");
  });

  it("deduplicates when factory produces the same CSS twice", () => {
    const { mod, emitted } = makeCollector();
    const gs = mod.globalStyle as GSFactory;
    gs(_css => "body { margin: 0; }");
    gs(_css => "body { margin: 0; }");
    expect(emitted).toHaveLength(1);
  });

  it("does not set prepend for globalStyle", () => {
    const { mod, emitted } = makeCollector();
    (mod.globalStyle as GSFactory)(_css => "html { box-sizing: border-box; }");
    expect(emitted[0].prepend).toBeFalsy();
  });

  it("factory can use the builder to produce CSS via .on()", () => {
    const { mod, emitted } = makeCollector();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (mod.globalStyle as (f: (css: any) => unknown) => void)(
      css => css({}).on("body", { margin: 0 }),
    );
    expect(emitted[0].css).toContain("body");
    expect(emitted[0].css).toContain("margin: 0");
  });
});

// ─── Themed() ────────────────────────────────────────────────────────────────

describe("extractionModule() — Themed()", () => {
  it("emits :root vars for the default theme", () => {
    const { mod, emitted } = makeCollector();
    const Themed = mod.Themed as (s: unknown, T: new () => unknown) => (c: unknown) => unknown;

    class MyTheme {
      colorBrand = "#3b82f6";
      spaceMd    = "16px";
    }

    Themed(null, MyTheme);
    expect(emitted).toHaveLength(1);
    expect(emitted[0].css).toContain(":root");
    expect(emitted[0].css).toContain("--color-brand: #3b82f6");
    expect(emitted[0].css).toContain("--space-md: 16px");
  });

  it("passes prepend=true so :root vars appear before class rules", () => {
    const { mod, emitted } = makeCollector();
    const Themed = mod.Themed as (s: unknown, T: new () => unknown) => (c: unknown) => unknown;
    Themed(null, class { colorBrand = "#fff"; });
    expect(emitted[0].prepend).toBe(true);
  });

  it("returns a function that passes through the decorated class", () => {
    const { mod } = makeCollector();
    const Themed = mod.Themed as (s: unknown, T: new () => unknown) => (c: unknown) => unknown;
    const result = Themed(null, class {});
    expect(typeof result).toBe("function");
    const cls = class {};
    expect(result(cls)).toBe(cls);
  });

  it("skips non-string and non-number theme properties", () => {
    const { mod, emitted } = makeCollector();
    const Themed = mod.Themed as (s: unknown, T: new () => unknown) => (c: unknown) => unknown;
    class MyTheme {
      colorText = "#111";
      nested    = { x: 1 };
      fn        = () => {};
    }
    Themed(null, MyTheme);
    expect(emitted[0].css).toContain("--color-text: #111");
    expect(emitted[0].css).not.toContain("--nested");
    expect(emitted[0].css).not.toContain("--fn");
  });

  it("emits nothing when theme constructor throws", () => {
    const { mod, emitted } = makeCollector();
    const Themed = mod.Themed as (s: unknown, T: new () => unknown) => (c: unknown) => unknown;
    class BadTheme { constructor() { throw new Error("oops"); } }
    expect(() => Themed(null, BadTheme)).not.toThrow();
    expect(emitted).toHaveLength(0);
  });

  it("deduplicates identical themes", () => {
    const { mod, emitted } = makeCollector();
    const Themed = mod.Themed as (s: unknown, T: new () => unknown) => (c: unknown) => unknown;
    class MyTheme { colorBrand = "#3b82f6"; }
    Themed(null, MyTheme);
    Themed(null, MyTheme);
    expect(emitted).toHaveLength(1);
  });
});

// ─── ThemeInstance ────────────────────────────────────────────────────────────

describe("extractionModule() — ThemeInstance", () => {
  it("constructor emits :root vars for the default theme", () => {
    const { mod, emitted } = makeCollector();
    const TI = mod.ThemeInstance as new (T: new () => unknown) => { switch(T: new () => unknown): void; destroy(): void };
    class LightTheme { colorBrand = "#3b82f6"; }
    new TI(LightTheme);
    expect(emitted[0].css).toContain(":root");
    expect(emitted[0].css).toContain("--color-brand: #3b82f6");
    expect(emitted[0].prepend).toBe(true);
  });

  it("deduplicates with Themed() — same theme only emitted once", () => {
    const { mod, emitted } = makeCollector();
    const TI = mod.ThemeInstance as new (T: new () => unknown) => unknown;
    const Themed = mod.Themed as (s: unknown, T: new () => unknown) => unknown;
    class MyTheme { colorBrand = "#3b82f6"; }

    Themed(null, MyTheme);
    new TI(MyTheme);
    expect(emitted).toHaveLength(1);
  });

  it("current getter returns an empty object", () => {
    const { mod } = makeCollector();
    const TI = mod.ThemeInstance as new (T: new () => unknown) => { current: unknown };
    const inst = new TI(class {});
    expect(inst.current).toEqual({});
  });

  it("createThemeInstance returns a ThemeInstance-like object", () => {
    const { mod, emitted } = makeCollector();
    const cti = mod.createThemeInstance as (T: new () => unknown) => unknown;
    class MyTheme { colorBrand = "#111"; }
    cti(MyTheme);
    expect(emitted[0].css).toContain("--color-brand: #111");
  });
});

// ─── Dedup across APIs ────────────────────────────────────────────────────────

describe("extractionModule() — cross-API deduplication", () => {
  it("Themed() and ThemeInstance share the same seen set", () => {
    const { mod, emitted } = makeCollector();
    const Themed = mod.Themed as (s: unknown, T: new () => unknown) => unknown;
    const TI = mod.ThemeInstance as new (T: new () => unknown) => unknown;
    class SharedTheme { colorBrand = "#f00"; }

    Themed(null, SharedTheme);
    new TI(SharedTheme);
    // Same CSS hash — should only appear once
    expect(emitted.filter(e => e.css.includes("--color-brand")).length).toBe(1);
  });
});

// ─── Additional coverage ──────────────────────────────────────────────────────

describe("extractionModule() — additional coverage", () => {
  it("the decorator returned by Styled() is callable", () => {
    const { mod } = makeCollector();
    const S = (mod as Mod & { Stylesheet: typeof Stylesheet }).Stylesheet;
    class TestStyles extends S { $x = this.css({ color: "red" }); }
    const Styled = mod.Styled as (cls: new () => unknown) => (target: unknown) => void;
    const dec = Styled(TestStyles);
    expect(() => dec(class {})).not.toThrow();
  });

  it("theme() returns an ExtractionThemeInstance", () => {
    const { mod } = makeCollector();
    const t = (mod.theme as () => { current: unknown })();
    expect(t).toBeDefined();
    expect(t.current).toEqual({});
  });

  it("ExtractionThemeInstance.switch() and destroy() are no-ops", () => {
    const { mod } = makeCollector();
    const TI = mod.ThemeInstance as new (T: new () => unknown) => { switch(T: new () => unknown): void; destroy(): void };
    const inst = new TI(class {});
    expect(() => inst.switch(class {})).not.toThrow();
    expect(() => inst.destroy()).not.toThrow();
  });

  it("themeToRootCSS returns null for a theme with no valid properties", () => {
    const { mod, emitted } = makeCollector();
    const Themed = mod.Themed as (s: unknown, T: new () => unknown) => unknown;
    class EmptyTheme { nested = { x: 1 }; }
    Themed(null, EmptyTheme);
    expect(emitted).toHaveLength(0);
  });

  it("the inner decorator functions returned by Param/Style/Theme are callable no-ops", () => {
    const { mod } = makeCollector();
    type Maker = () => (...args: unknown[]) => void;
    const callInner = (fn: Maker) => { const dec = fn(); expect(() => dec()).not.toThrow(); };
    callInner(mod.Param as Maker);
    callInner(mod.Style as Maker);
    callInner(mod.Theme as Maker);
  });
});
