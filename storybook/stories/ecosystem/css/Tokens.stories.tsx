import { StatefulComponent } from "@praxisjs/core";
import { Component, State } from "@praxisjs/decorators";
import { TokenSheet, tokenVars, ThemeInstance, Stylesheet, Styled, cx } from "@praxisjs/css";
import type { Meta, StoryObj } from "@praxisjs/storybook";

// ─── Token skeleton ───────────────────────────────────────────────────────────

class AppTokens extends TokenSheet {
  colorPrimary!:   string;
  colorSecondary!: string;
  colorBg!:        string;
  colorSurface!:   string;
  colorText!:      string;
  colorMuted!:     string;
  radiusMd!:       string;
  spaceSm!:        string;
  spaceMd!:        string;
}

const t = tokenVars(AppTokens);

// ─── Themes ───────────────────────────────────────────────────────────────────

class LightTheme extends AppTokens {
  colorPrimary   = "#3b82f6";
  colorSecondary = "#64748b";
  colorBg        = "#ffffff";
  colorSurface   = "#f8fafc";
  colorText      = "#0f172a";
  colorMuted     = "#94a3b8";
  radiusMd       = "10px";
  spaceSm        = "8px";
  spaceMd        = "16px";
}

class DarkTheme extends LightTheme {
  colorPrimary   = "#60a5fa";
  colorBg        = "#0f172a";
  colorSurface   = "#1e293b";
  colorText      = "#f8fafc";
  colorMuted     = "#475569";
}

class EmeraldTheme extends LightTheme {
  colorPrimary   = "#10b981";
  colorSecondary = "#047857";
}

class RoseTheme extends LightTheme {
  colorPrimary   = "#f43f5e";
  colorSecondary = "#be123c";
}

// ─── Stylesheets using tokens ─────────────────────────────────────────────────

class DemoStyles extends Stylesheet {
  $wrap = this.css({
    display: "flex", flexDirection: "column", gap: t.spaceMd,
    padding: t.spaceMd,
    background: t.colorBg, color: t.colorText,
    fontFamily: "sans-serif",
    borderRadius: t.radiusMd,
    transition: "background 0.25s, color 0.25s",
    minWidth: "300px", maxWidth: "400px",
    border: `1px solid color-mix(in srgb, ${t.colorPrimary} 20%, transparent)`,
  });

  $card = this.css({
    background: t.colorSurface,
    padding: t.spaceMd,
    borderRadius: t.radiusMd,
    border: `1px solid color-mix(in srgb, ${t.colorText} 10%, transparent)`,
    transition: "background 0.25s, border-color 0.25s",
  });

  $label = this.css({
    fontSize: "0.75rem", fontWeight: 600, textTransform: "uppercase",
    letterSpacing: "0.08em", color: t.colorMuted,
  });

  $badge = this.css({
    display: "inline-flex", alignItems: "center",
    padding: "3px 10px", borderRadius: "99px",
    fontSize: "0.78rem", fontWeight: 600,
    background: `color-mix(in srgb, ${t.colorPrimary} 15%, transparent)`,
    color: t.colorPrimary,
    transition: "background 0.25s, color 0.25s",
  });

  $row = this.css({ display: "flex", gap: t.spaceSm, flexWrap: "wrap", alignItems: "center" });

  $btn = this.css({
    padding: "6px 14px", borderRadius: t.radiusMd,
    fontSize: "0.82rem", fontWeight: 500,
    border: `1.5px solid ${t.colorPrimary}`,
    background: "transparent", color: t.colorPrimary,
    cursor: "pointer", transition: "background 0.15s, color 0.15s",
  })
    .hover({ background: t.colorPrimary, color: "#fff" });

  $btnActive = this.css({
    background: t.colorPrimary, color: "#fff",
  });
}

// ─── Component ────────────────────────────────────────────────────────────────

const THEMES = [
  { label: "Light",   cls: LightTheme },
  { label: "Dark",    cls: DarkTheme },
  { label: "Emerald", cls: EmeraldTheme },
  { label: "Rose",    cls: RoseTheme },
] as const;

@Component()
class TokensDemo extends StatefulComponent {
  #themeInst = new ThemeInstance(LightTheme);

  @State() activeTheme: string = "Light";

  @Styled(DemoStyles) $s!: DemoStyles;

  setTheme(label: string, cls: new () => AppTokens): void {
    this.activeTheme = label;
    this.#themeInst.switch(cls);
  }

  render() {
    return (
      <div class={this.$s.$wrap}>
        <div>
          <p class={this.$s.$label} style="margin: 0 0 8px;">Active theme</p>
          <span class={this.$s.$badge}>{() => this.activeTheme}</span>
        </div>

        <div class={this.$s.$card}>
          <p class={this.$s.$label} style="margin: 0 0 10px;">Stylesheet tokens</p>
          <p style="margin: 0; font-size: 0.875rem; line-height: 1.5;">
            Every color and size in this card comes from a CSS custom property
            on <code>:root</code>. Switching themes updates the vars — no
            re-renders, no class changes.
          </p>
        </div>

        <div>
          <p class={this.$s.$label} style="margin: 0 0 8px;">Switch theme</p>
          <div class={this.$s.$row}>
            {THEMES.map(({ label, cls }) => (
              <button
                key={label}
                class={() => cx(this.$s.$btn, { [this.$s.$btnActive]: this.activeTheme === label })}
                onClick={() => this.setTheme(label, cls as new () => AppTokens)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }
}

// ─── Story ────────────────────────────────────────────────────────────────────

const meta: Meta = {
  title: "Ecosystem/CSS/Tokens",
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj;

export const TokensStory: Story = {
  name: "TokenSheet + ThemeInstance — design tokens with theme switching",
  render: () => <TokensDemo />,
};
