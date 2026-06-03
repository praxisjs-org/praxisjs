import { StatefulComponent } from "@praxisjs/core";
import { Component, State } from "@praxisjs/decorators";
import { Param, ReactiveStylesheet, Styled, cx } from "@praxisjs/css";
import type { Meta, StoryObj } from "@praxisjs/storybook";

class CardStyles extends ReactiveStylesheet {
  @Param() color  = "#6d5bbd";
  @Param() radius = "10px";

  $root = this.css({
    display: "flex", flexDirection: "column", gap: "12px",
    padding: "20px", paddingLeft: "24px",
    borderRadius: "var(--radius)",
    border: "1px solid color-mix(in srgb, var(--color) 25%, transparent)",
    borderLeft: "4px solid var(--color)",
    background: "color-mix(in srgb, var(--color) 6%, white)",
    fontFamily: "sans-serif", cursor: "pointer", userSelect: "none",
    minWidth: "260px", transition: "border-color 0.2s, background 0.2s, box-shadow 0.2s",
  });

  $selected = this.css({
    boxShadow: "0 0 0 3px color-mix(in srgb, var(--color) 25%, transparent)",
    background: "color-mix(in srgb, var(--color) 12%, white)",
  });

  $title = this.css({ fontSize: "0.875rem", fontWeight: 600, color: "var(--color)", margin: "0" });

  $badge = this.css({
    display: "inline-flex", alignItems: "center",
    fontSize: "0.75rem", fontWeight: 500,
    padding: "3px 10px", borderRadius: "99px",
    background: "color-mix(in srgb, var(--color) 15%, white)",
    color: "var(--color)", transition: "background 0.2s, color 0.2s",
  });

  $badgeActive = this.css({ background: "var(--color)", color: "#fff" });
  $hint        = this.css({ fontSize: "0.78rem", color: "#8b83bc", margin: "0" });
}

const THEMES = [
  { label: "Purple", color: "#6d5bbd" },
  { label: "Blue",   color: "#3b82f6" },
  { label: "Green",  color: "#10b981" },
  { label: "Red",    color: "#ef4444" },
  { label: "Orange", color: "#f97316" },
];

@Component()
class StyledDemo extends StatefulComponent {
  @State() selected = false;

  @Styled(CardStyles)
  $card!: CardStyles;

  render() {
    return (
      <div style="display: flex; flex-direction: column; gap: 16px; font-family: sans-serif;">
        <div
          class={() => cx(this.$card.$root, { [this.$card.$selected]: this.selected })}
          onClick={() => { this.selected = !this.selected; }}
        >
          <h3 class={this.$card.$title}>@Styled + @Param</h3>

          <div>
            <span class={() => cx(this.$card.$badge, { [this.$card.$badgeActive]: this.selected })}>
              {() => this.selected ? "✓ Selected" : "Click to select"}
            </span>
          </div>

          <p class={this.$card.$hint}>
            The color and radius are <code>@Param()</code> fields — changing them
            updates CSS vars directly on the element, zero re-render.
          </p>
        </div>

        <div style="display: flex; gap: 8px; flex-wrap: wrap; align-items: center;">
          <span style="font-size: 0.78rem; color: #6b7280; min-width: 52px;">Color:</span>
          {THEMES.map(({ label, color }) => (
            <button
              key={label}
              onClick={() => { this.$card.color = color; }}
              style={`
                padding: 4px 12px; border-radius: 6px; font-size: 0.78rem; cursor: pointer;
                border: 2px solid ${color}; background: ${color}; color: #fff;
                font-weight: 500;
              `}
            >
              {label}
            </button>
          ))}
        </div>

        <div style="display: flex; gap: 8px; align-items: center;">
          <span style="font-size: 0.78rem; color: #6b7280; min-width: 52px;">Radius:</span>
          {["0px", "4px", "10px", "20px"].map((r) => (
            <button
              key={r}
              onClick={() => { this.$card.radius = r; }}
              style="padding: 4px 12px; border-radius: 6px; font-size: 0.78rem; cursor: pointer; border: 1px solid #d1d5db; background: transparent; color: #374151;"
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
  title: "Ecosystem/CSS/Styled",
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj;

export const StyledStory: Story = {
  name: "Styled + @Param — scoped classes + reactive CSS vars",
  render: () => <StyledDemo />,
};
