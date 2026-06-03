import { TokenSheet } from "@praxisjs/css";

// ─── Skeleton ─────────────────────────────────────────────────────────────────
// Static properties return CSS var references: AppTokens.colorBrand → 'var(--color-brand)'

export class AppTokens extends TokenSheet {
  colorBrand!:         string;  // → --color-brand
  colorBrandSoft!:     string;  // → --color-brand-soft
  colorBg!:            string;  // → --color-bg
  colorBgAlt!:         string;  // → --color-bg-alt
  colorBgElv!:         string;  // → --color-bg-elv
  colorBgSoft!:        string;  // → --color-bg-soft
  colorText!:          string;  // → --color-text
  colorTextSecondary!: string;  // → --color-text-secondary
  colorTextMuted!:     string;  // → --color-text-muted
  colorBorder!:        string;  // → --color-border
  colorDivider!:       string;  // → --color-divider
  shadowSm!:           string;  // → --shadow-sm
  shadowMd!:           string;  // → --shadow-md
  shadowLg!:           string;  // → --shadow-lg
  radiusSm!:           string;  // → --radius-sm
  radiusMd!:           string;  // → --radius-md
  radiusLg!:           string;  // → --radius-lg
}

// ─── Themes ───────────────────────────────────────────────────────────────────

export class LightTheme extends AppTokens {
  colorBrand         = "#6d5bbd";
  colorBrandSoft     = "rgba(109, 91, 189, 0.12)";
  colorBg            = "#fbfaff";
  colorBgAlt         = "#f4f2fb";
  colorBgElv         = "#ffffff";
  colorBgSoft        = "#ece9f7";
  colorText          = "#1c1830";
  colorTextSecondary = "#4b4668";
  colorTextMuted     = "#9a94b8";
  colorBorder        = "rgba(109, 91, 189, 0.18)";
  colorDivider       = "rgba(28, 24, 48, 0.08)";
  shadowSm           = "0 1px 2px rgba(0, 0, 0, 0.05)";
  shadowMd           = "0 4px 12px rgba(0, 0, 0, 0.08)";
  shadowLg           = "0 8px 24px rgba(0, 0, 0, 0.12)";
  radiusSm           = "4px";
  radiusMd           = "8px";
  radiusLg           = "14px";
}

export class DarkTheme extends LightTheme {
  colorBrand         = "#9b90e6";
  colorBrandSoft     = "rgba(155, 144, 230, 0.18)";
  colorBg            = "#0f0d17";
  colorBgAlt         = "#161326";
  colorBgElv         = "#1b1830";
  colorBgSoft        = "#221e3d";
  colorText          = "#f4f2ff";
  colorTextSecondary = "#c7c3e6";
  colorTextMuted     = "#6f6a8f";
  colorBorder        = "rgba(155, 144, 230, 0.25)";
  colorDivider       = "rgba(255, 255, 255, 0.06)";
  shadowSm           = "0 1px 2px rgba(0, 0, 0, 0.4)";
  shadowMd           = "0 4px 16px rgba(0, 0, 0, 0.5)";
  shadowLg           = "0 8px 32px rgba(0, 0, 0, 0.6)";
}
