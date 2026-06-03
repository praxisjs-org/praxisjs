// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ThemeInstance, createThemeInstance, theme } from "../tokens/theme-instance";
import { TokenSheet } from "../tokens/token-sheet";
import { createCollector, setCollector } from "../internal/collector";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

class AppTokens extends TokenSheet {
  colorPrimary!: string;
  colorBg!:      string;
  spaceMd!:      string;
}

class LightTheme extends AppTokens {
  colorPrimary = "#3b82f6";
  colorBg      = "#ffffff";
  spaceMd      = "16px";
}

class DarkTheme extends LightTheme {
  colorPrimary = "#60a5fa";
  colorBg      = "#0f172a";
}

class OtherTheme extends AppTokens {
  colorPrimary = "#10b981";
  colorBg      = "#f0fdf4";
  spaceMd      = "20px";
}

function styleEl(): HTMLStyleElement | null {
  return document.querySelector("style[data-praxis-theme]");
}

// ─── Setup / teardown ─────────────────────────────────────────────────────────

beforeEach(() => {
  styleEl()?.remove();
  localStorage.clear();
});

afterEach(() => {
  styleEl()?.remove();
  localStorage.clear();
});

// ─── Construction ─────────────────────────────────────────────────────────────

describe("ThemeInstance — construction", () => {
  it("injects a <style data-praxis-theme> element on :root", () => {
    const t = new ThemeInstance(LightTheme);
    expect(styleEl()).not.toBeNull();
    t.destroy();
  });

  it("injected CSS contains the correct CSS var names and values", () => {
    const t = new ThemeInstance(LightTheme);
    const css = styleEl()?.textContent ?? "";
    expect(css).toContain("--color-primary: #3b82f6");
    expect(css).toContain("--color-bg: #ffffff");
    expect(css).toContain("--space-md: 16px");
    t.destroy();
  });

  it("current returns an instance of the default theme", () => {
    const t = new ThemeInstance(LightTheme);
    expect(t.current).toBeInstanceOf(LightTheme);
    t.destroy();
  });
});

// ─── switch() ────────────────────────────────────────────────────────────────

describe("ThemeInstance — switch()", () => {
  it("updates :root with new theme values", () => {
    const t = new ThemeInstance(LightTheme);
    t.switch(DarkTheme);
    const css = styleEl()?.textContent ?? "";
    expect(css).toContain("--color-primary: #60a5fa");
    expect(css).toContain("--color-bg: #0f172a");
    t.destroy();
  });

  it("current returns an instance of the new theme after switch", () => {
    const t = new ThemeInstance(LightTheme);
    t.switch(DarkTheme);
    expect(t.current).toBeInstanceOf(DarkTheme);
    t.destroy();
  });

  it("inherits values from parent theme for non-overridden keys", () => {
    const t = new ThemeInstance(LightTheme);
    t.switch(DarkTheme);
    const css = styleEl()?.textContent ?? "";
    // spaceMd is not overridden in DarkTheme — inherits from LightTheme
    expect(css).toContain("--space-md: 16px");
    t.destroy();
  });

  it("can switch back to the original theme", () => {
    const t = new ThemeInstance(LightTheme);
    t.switch(DarkTheme);
    t.switch(LightTheme);
    const css = styleEl()?.textContent ?? "";
    expect(css).toContain("--color-primary: #3b82f6");
    t.destroy();
  });

  it("only one <style> element exists after multiple switches", () => {
    const t = new ThemeInstance(LightTheme);
    t.switch(DarkTheme);
    t.switch(OtherTheme);
    expect(document.querySelectorAll("style[data-praxis-theme]").length).toBe(1);
    t.destroy();
  });
});

// ─── destroy() ───────────────────────────────────────────────────────────────

describe("ThemeInstance — destroy()", () => {
  it("removes the <style> element", () => {
    const t = new ThemeInstance(LightTheme);
    expect(styleEl()).not.toBeNull();
    t.destroy();
    expect(styleEl()).toBeNull();
  });
});

// ─── persist ─────────────────────────────────────────────────────────────────

describe("ThemeInstance — persist: true", () => {
  it("saves CSS vars to localStorage on switch()", () => {
    const t = new ThemeInstance(LightTheme, { persist: true });
    t.switch(DarkTheme);
    const saved = JSON.parse(localStorage.getItem("praxis-theme") ?? "{}") as Record<string, string>;
    expect(saved["--color-primary"]).toBe("#60a5fa");
    expect(saved["--color-bg"]).toBe("#0f172a");
    t.destroy();
  });

  it("restores saved vars from localStorage on construction", () => {
    localStorage.setItem("praxis-theme", JSON.stringify({
      "--color-primary": "#ef4444",
      "--color-bg":      "#fff1f2",
    }));
    const t = new ThemeInstance(LightTheme, { persist: true });
    const css = styleEl()?.textContent ?? "";
    expect(css).toContain("--color-primary: #ef4444");
    expect(css).toContain("--color-bg: #fff1f2");
    t.destroy();
  });

  it("falls back to default theme when localStorage is empty", () => {
    const t = new ThemeInstance(LightTheme, { persist: true });
    const css = styleEl()?.textContent ?? "";
    expect(css).toContain("--color-primary: #3b82f6");
    t.destroy();
  });

  it("does not touch localStorage when persist is false", () => {
    const t = new ThemeInstance(LightTheme, { persist: false });
    t.switch(DarkTheme);
    expect(localStorage.getItem("praxis-theme")).toBeNull();
    t.destroy();
  });
});

// ─── syncTabs ────────────────────────────────────────────────────────────────

function makeBCMock(overrides: Partial<{
  addEventListener: (type: string, handler: (e: MessageEvent) => void) => void;
  postMessage: (data: unknown) => void;
  close: () => void;
}> = {}) {
  const channel = {
    addEventListener: vi.fn(),
    postMessage: vi.fn(),
    close: vi.fn(),
    ...overrides,
  };
  // BroadcastChannel must be a real constructor (not an arrow fn)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function MockBC(this: unknown) { return channel; }
  vi.stubGlobal("BroadcastChannel", MockBC);
  return channel;
}

describe("ThemeInstance — syncTabs: true", () => {
  afterEach(() => { vi.unstubAllGlobals(); });

  it("closes the BroadcastChannel on destroy()", () => {
    const channel = makeBCMock();
    const t = new ThemeInstance(LightTheme, { syncTabs: true });
    t.destroy();
    expect(channel.close).toHaveBeenCalled();
  });

  it("posts vars to the channel on switch()", () => {
    const channel = makeBCMock();
    const t = new ThemeInstance(LightTheme, { syncTabs: true });
    t.switch(DarkTheme);
    expect(channel.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({ vars: expect.objectContaining({ "--color-primary": "#60a5fa" }) }),
    );
    t.destroy();
  });

  it("applies incoming broadcast vars to :root", () => {
    let handler: (e: MessageEvent) => void = () => {};
    makeBCMock({
      addEventListener: (_type: string, fn: (e: MessageEvent) => void) => { handler = fn; },
    });

    const t = new ThemeInstance(LightTheme, { syncTabs: true });
    handler({ data: { vars: { "--color-primary": "#f97316" } } } as MessageEvent);

    expect(styleEl()?.textContent).toContain("--color-primary: #f97316");
    t.destroy();
  });

  it("skips applyVarsToRoot when message has no vars", () => {
    let handler: (e: MessageEvent) => void = () => {};
    makeBCMock({
      addEventListener: (_type: string, fn: (e: MessageEvent) => void) => { handler = fn; },
    });

    const t = new ThemeInstance(LightTheme, { syncTabs: true });
    const before = styleEl()?.textContent;
    handler({ data: {} } as MessageEvent);
    expect(styleEl()?.textContent).toBe(before);
    t.destroy();
  });
});

// ─── createThemeInstance / theme() ───────────────────────────────────────────

describe("createThemeInstance / theme()", () => {
  it("creates and returns a ThemeInstance", () => {
    const t = createThemeInstance(LightTheme);
    expect(t).toBeInstanceOf(ThemeInstance);
    expect(theme()).toBe(t);
    t.destroy();
  });

  it("passes config to ThemeInstance (persist)", () => {
    const t = createThemeInstance(LightTheme, { persist: true });
    t.switch(DarkTheme);
    expect(localStorage.getItem("praxis-theme")).not.toBeNull();
    t.destroy();
  });

  it("subsequent call overwrites the singleton", () => {
    const t1 = createThemeInstance(LightTheme);
    const t2 = createThemeInstance(DarkTheme);
    expect(theme()).toBe(t2);
    expect(theme()).not.toBe(t1);
    t2.destroy();
  });
});

// ─── #loadFromStorage error branch ───────────────────────────────────────────

describe("ThemeInstance — corrupt localStorage", () => {
  it("falls back to default theme when stored JSON is invalid", () => {
    localStorage.setItem("praxis-theme", "{ not: valid }}}");
    const t = new ThemeInstance(LightTheme, { persist: true });
    expect(styleEl()?.textContent).toContain("--color-primary: #3b82f6");
    t.destroy();
  });
});

// ─── Numeric token values (instanceToVars number branch) ─────────────────────

describe("ThemeInstance — numeric token values", () => {
  it("converts number token values to CSS var strings and skips non-string/non-number values", () => {
    class NumericTheme {
      opacity   = 0.9;         // number
      fontSize  = 14;          // number
      colorText = "#111";      // string
      nested    = { x: 1 };   // object — must be skipped
    }
    const t = new ThemeInstance(NumericTheme as new () => unknown);
    const css = styleEl()?.textContent ?? "";
    expect(css).toContain("--opacity: 0.9");
    expect(css).toContain("--font-size: 14");
    expect(css).toContain("--color-text: #111");
    expect(css).not.toContain("--nested");
    t.destroy();
  });
});

// ─── SSR — document undefined ────────────────────────────────────────────────

describe("ThemeInstance — SSR (document === undefined)", () => {
  afterEach(() => { vi.unstubAllGlobals(); });

  it("constructor does not throw when document is undefined", () => {
    vi.stubGlobal("document", undefined);
    expect(() => new ThemeInstance(LightTheme)).not.toThrow();
  });

  it("switch() does not throw when document is undefined", () => {
    vi.stubGlobal("document", undefined);
    const t = new ThemeInstance(LightTheme);
    expect(() => t.switch(DarkTheme)).not.toThrow();
  });

  it("destroy() does not throw when document is undefined", () => {
    vi.stubGlobal("document", undefined);
    const t = new ThemeInstance(LightTheme);
    expect(() => t.destroy()).not.toThrow();
  });

  it("broadcast message handler does not throw when document is undefined", () => {
    let handler: (e: MessageEvent) => void = () => {};
    makeBCMock({
      addEventListener: (_type: string, fn: (e: MessageEvent) => void) => { handler = fn; },
    });

    const t = new ThemeInstance(LightTheme, { syncTabs: true });
    vi.stubGlobal("document", undefined);
    // applyVarsToRoot is called directly from the broadcast handler — its own
    // SSR guard (line 18) must short-circuit without throwing
    expect(() => handler({ data: { vars: { "--color-primary": "#f97316" } } } as MessageEvent)).not.toThrow();
    t.destroy();
  });
});

// ─── Collector routing (applyVarsToRoot) ─────────────────────────────────────

describe("ThemeInstance — collector routing", () => {
  afterEach(() => { setCollector(null); });

  it("routes :root injection through the collector when one is active", () => {
    const col = createCollector();
    setCollector(col);
    new ThemeInstance(LightTheme);
    expect(col.getCSS()).toContain("--color-primary: #3b82f6");
    expect(document.querySelector("style[data-praxis-theme]")).toBeNull();
  });

  it("collector receives :root CSS on switch() too", () => {
    const col = createCollector();
    new ThemeInstance(LightTheme);      // initial inject without collector
    setCollector(col);
    const t = new ThemeInstance(DarkTheme);
    expect(col.getCSS()).toContain("--color-primary: #60a5fa");
    t.destroy();
  });
});

// ─── BroadcastChannel unavailable ────────────────────────────────────────────

describe("ThemeInstance — BroadcastChannel unavailable", () => {
  afterEach(() => { vi.unstubAllGlobals(); });

  it("does not throw when BroadcastChannel is undefined with syncTabs: true", () => {
    vi.stubGlobal("BroadcastChannel", undefined);
    const t = new ThemeInstance(LightTheme, { syncTabs: true });
    expect(styleEl()).not.toBeNull();
    t.destroy();
  });
});

// ─── theme() before createThemeInstance ──────────────────────────────────────

describe("theme() — not yet initialized", () => {
  it("throws a descriptive error when called before createThemeInstance", async () => {
    vi.resetModules();
    const { theme: freshTheme } = await import("../tokens/theme-instance");
    expect(() => freshTheme()).toThrow("[PraxisJS] theme() called before @Themed()");
  });
});
