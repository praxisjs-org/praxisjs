import { StatefulComponent } from "@praxisjs/core";
import { Component, State } from "@praxisjs/decorators";
import { Param, ReactiveStylesheet, Style, Styled, cx } from "@praxisjs/css";
import type { Meta, StoryObj } from "@praxisjs/storybook";

/**
 * @Styled handles scoped CSS classes (structural, static).
 * @Style handles reactive CSS custom properties on the component element itself.
 * @Param() handles reactive CSS custom properties defined within the Stylesheet.
 *
 * Together they cover every layer of a component's styling.
 */

class AlertStyles extends ReactiveStylesheet {
  @Param() severity = "info";  // used in JS to pick class, not a CSS var here

  $root = this.css({
    display: "flex", alignItems: "flex-start", gap: "12px", padding: "16px",
    borderRadius: "var(--radius)", borderLeft: "4px solid var(--border)",
    background: "var(--bg)", fontFamily: "sans-serif",
    transition: "background 0.2s, border-color 0.2s",
  });
  $icon  = this.css({ fontSize: "1.25rem", lineHeight: 1 });
  $title = this.css({ fontSize: "0.875rem", fontWeight: 600, color: "var(--text)", margin: "0 0 2px" });
  $body  = this.css({ fontSize: "0.8rem", color: "var(--text)", opacity: 0.85, margin: "0" });
}

const SEVERITY_THEMES = {
  info:    { bg: "#eff6ff", border: "#3b82f6", text: "#1e40af", icon: "ℹ️" },
  success: { bg: "#f0fdf4", border: "#22c55e", text: "#166534", icon: "✅" },
  warning: { bg: "#fffbeb", border: "#f59e0b", text: "#92400e", icon: "⚠️" },
  error:   { bg: "#fef2f2", border: "#ef4444", text: "#991b1b", icon: "❌" },
} as const;

type Severity = keyof typeof SEVERITY_THEMES;

@Component()
class AlertDemo extends StatefulComponent {
  @State() severity: Severity = "info";
  @State() radius = "8px";

  // @Style sets CSS vars on the component's container element.
  // AlertStyles reads them via var(--bg), var(--border), etc.
  @Style("--bg")     bg: string     = SEVERITY_THEMES.info.bg;
  @Style("--border") border: string = SEVERITY_THEMES.info.border;
  @Style("--text")   text: string   = SEVERITY_THEMES.info.text;
  @Style("--radius") radius2        = "8px";

  @Styled(AlertStyles) $alert!: AlertStyles;

  setSeverity(s: Severity) {
    const theme = SEVERITY_THEMES[s];
    this.bg     = theme.bg;
    this.border = theme.border;
    this.text   = theme.text;
    this.severity = s;
  }

  setRadius(r: string) {
    this.radius2 = r;
    this.radius = r;
  }

  render() {
    return (
      <div style="display: flex; flex-direction: column; gap: 20px; font-family: sans-serif; padding: 4px;">
        <div class={this.$alert.$root}>
          <span class={this.$alert.$icon}>
            {() => SEVERITY_THEMES[this.severity].icon}
          </span>
          <div>
            <p class={this.$alert.$title}>
              {() => this.severity.charAt(0).toUpperCase() + this.severity.slice(1)}
            </p>
            <p class={this.$alert.$body}>
              @Style sets CSS vars on the container. @Styled defines scoped class names
              that use those vars. Zero re-renders when the theme changes.
            </p>
          </div>
        </div>

        <div style="display: flex; gap: 8px; flex-wrap: wrap;">
          {(Object.keys(SEVERITY_THEMES) as Severity[]).map((s) => (
            <button
              key={s}
              onClick={() => this.setSeverity(s)}
              style={() => `
                padding: 6px 14px; border-radius: 6px; font-size: 0.78rem; cursor: pointer;
                border: 1px solid ${SEVERITY_THEMES[s].border};
                background: ${this.severity === s ? SEVERITY_THEMES[s].border : "transparent"};
                color: ${this.severity === s ? "#fff" : SEVERITY_THEMES[s].text};
              `}
            >
              {s}
            </button>
          ))}
        </div>

        <div style="display: flex; gap: 8px; align-items: center;">
          <span style="font-size: 0.78rem; color: #6b7280;">Radius:</span>
          {["0px", "4px", "8px", "16px"].map((r) => (
            <button
              key={r}
              onClick={() => this.setRadius(r)}
              style={() => `
                padding: 4px 10px; border-radius: 6px; font-size: 0.78rem; cursor: pointer;
                border: 1px solid #d1d5db;
                background: ${this.radius === r ? "#6d5bbd" : "transparent"};
                color: ${this.radius === r ? "#fff" : "#374151"};
              `}
            >
              {r}
            </button>
          ))}
        </div>
      </div>
    );
  }
}

const meta: Meta = {
  title: "Ecosystem/CSS/StyledAndStyle",
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj;

export const StyledAndStyleStory: Story = {
  name: "@Styled + @Style — scoped classes with reactive CSS vars",
  render: () => <AlertDemo />,
};
