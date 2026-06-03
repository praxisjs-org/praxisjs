// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { Themed, Theme } from "../tokens/decorators";
import { theme, ThemeInstance, createThemeInstance } from "../tokens/theme-instance";
import { TokenSheet } from "../tokens/token-sheet";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

class AppTokens extends TokenSheet {
  colorPrimary!: string;
  colorBg!:      string;
}

class LightTheme extends AppTokens {
  colorPrimary = "#3b82f6";
  colorBg      = "#ffffff";
}

class DarkTheme extends LightTheme {
  colorPrimary = "#60a5fa";
  colorBg      = "#0f172a";
}

function styleEl(): HTMLStyleElement | null {
  return document.querySelector("style[data-praxis-theme]");
}

beforeEach(() => { styleEl()?.remove(); });
afterEach(() => { styleEl()?.remove(); });

// ─── @Themed ──────────────────────────────────────────────────────────────────

describe("@Themed — class decorator", () => {
  it("initialize() creates a ThemeInstance singleton at class-decoration time", () => {
    @Themed(AppTokens, LightTheme)
    class App {}
    void App;

    expect(theme()).toBeInstanceOf(ThemeInstance);
    expect(styleEl()).not.toBeNull();
  });

  it("injected :root vars match the default theme", () => {
    @Themed(AppTokens, LightTheme)
    class App {}
    void App;

    const css = styleEl()?.textContent ?? "";
    expect(css).toContain("--color-primary: #3b82f6");
    expect(css).toContain("--color-bg: #ffffff");
  });

  it("create() re-creates the singleton when the class is instantiated", () => {
    @Themed(AppTokens, DarkTheme)
    class App {
      // minimal render so createClassDecorator doesn't strip it
      render() { return null; }
    }

    const t = theme();
    expect(t.current).toBeInstanceOf(DarkTheme);

    // Instantiating the class triggers create() which calls createThemeInstance again
    new App();
    expect(theme()).toBeInstanceOf(ThemeInstance);
  });

  it("passes persist config to ThemeInstance", () => {
    @Themed(AppTokens, LightTheme, { persist: true })
    class App {}
    void App;

    theme().switch(DarkTheme);
    expect(localStorage.getItem("praxis-theme")).not.toBeNull();
    localStorage.clear();
  });

  it("second @Themed decoration overwrites the singleton", () => {
    @Themed(AppTokens, LightTheme)
    class App {}
    void App;

    @Themed(AppTokens, DarkTheme)
    class App2 {}
    void App2;

    expect((theme().current as DarkTheme).colorPrimary).toBe("#60a5fa");
  });
});

// ─── @Theme ───────────────────────────────────────────────────────────────────

describe("@Theme — field decorator", () => {
  it("returns the singleton ThemeInstance via getter", () => {
    createThemeInstance(LightTheme);

    class Comp {
      @Theme() theme!: ThemeInstance;
    }

    expect(new Comp().theme).toBe(theme());
  });

  it("same reference on every access", () => {
    createThemeInstance(LightTheme);

    class Comp {
      @Theme() theme!: ThemeInstance;
    }

    const c = new Comp();
    expect(c.theme).toBe(c.theme);
  });

  it("setter is a no-op — value stays unchanged", () => {
    createThemeInstance(LightTheme);

    class Comp {
      @Theme() theme!: ThemeInstance;
    }

    const c = new Comp();
    const before = c.theme;
    (c as unknown as Record<string, unknown>).theme = "anything";
    expect(c.theme).toBe(before);
  });
});
