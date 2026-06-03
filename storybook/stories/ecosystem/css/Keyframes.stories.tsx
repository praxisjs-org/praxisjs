import { StatefulComponent } from "@praxisjs/core";
import { Component, State } from "@praxisjs/decorators";
import { keyframes, Stylesheet, Styled } from "@praxisjs/css";
import type { Meta, StoryObj } from "@praxisjs/storybook";

// ─── Shared keyframe animations ───────────────────────────────────────────────

const spin = keyframes("spin", {
  from: { transform: "rotate(0deg)" },
  to:   { transform: "rotate(360deg)" },
});

const pulse = keyframes("pulse", {
  "0%, 100%": { opacity: 1, transform: "scale(1)" },
  "50%":       { opacity: 0.5, transform: "scale(0.95)" },
});

const fadeIn = keyframes("fade-in", {
  from: { opacity: 0, transform: "translateY(8px)" },
  to:   { opacity: 1, transform: "translateY(0)" },
});

const bounce = keyframes("bounce", {
  "0%, 100%": { transform: "translateY(0)", animationTimingFunction: "cubic-bezier(0.8, 0, 1, 1)" },
  "50%":       { transform: "translateY(-12px)", animationTimingFunction: "cubic-bezier(0, 0, 0.2, 1)" },
});

const shimmer = keyframes("shimmer", {
  from: { backgroundPosition: "-200% 0" },
  to:   { backgroundPosition: "200% 0" },
});

// ─── Stylesheet ───────────────────────────────────────────────────────────────

class AnimStyles extends Stylesheet {
  $wrapper = this.css({
    display: "flex",
    flexDirection: "column",
    gap: "24px",
    padding: "24px",
    fontFamily: "sans-serif",
    maxWidth: "480px",
  });

  $row = this.css({
    display: "flex",
    alignItems: "center",
    gap: "16px",
  });

  $label = this.css({
    fontSize: "0.8rem",
    color: "#6b7280",
    minWidth: "120px",
  });

  $spinner = this.css({
    width: "28px",
    height: "28px",
    borderRadius: "50%",
    border: "3px solid #e5e7eb",
    borderTopColor: "#6d5bbd",
    animation: `${spin} 0.8s linear infinite`,
    flexShrink: 0,
  });

  $pulseBadge = this.css({
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    padding: "4px 10px",
    borderRadius: "99px",
    background: "#ede9fe",
    color: "#6d5bbd",
    fontSize: "0.75rem",
    fontWeight: 500,
    animation: `${pulse} 1.5s ease-in-out infinite`,
  });

  $dot = this.css({
    width: "8px",
    height: "8px",
    borderRadius: "50%",
    background: "#6d5bbd",
    flexShrink: 0,
  });

  $fadeCard = this.css({
    padding: "12px 16px",
    border: "1px solid #e5e7eb",
    borderRadius: "8px",
    fontSize: "0.875rem",
    color: "#374151",
    animation: `${fadeIn} 0.4s ease both`,
  });

  $bounceIcon = this.css({
    width: "32px",
    height: "32px",
    borderRadius: "8px",
    background: "#6d5bbd",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#fff",
    fontSize: "1rem",
    animation: `${bounce} 1s infinite`,
    flexShrink: 0,
  });

  $shimmerBar = this.css({
    height: "16px",
    borderRadius: "4px",
    background: "linear-gradient(90deg, #f3f4f6 25%, #e5e7eb 50%, #f3f4f6 75%)",
    backgroundSize: "400% 100%",
    animation: `${shimmer} 1.5s ease-in-out infinite`,
    flex: 1,
  });

  $btn = this.css({
    padding: "6px 14px",
    borderRadius: "6px",
    border: "1px solid #d1d5db",
    background: "transparent",
    fontSize: "0.78rem",
    cursor: "pointer",
    fontFamily: "sans-serif",
    color: "#374151",
  })
    .hover({ background: "#f9fafb" });

  $restartHint = this.css({
    fontSize: "0.75rem",
    color: "#9ca3af",
    margin: "0",
    fontStyle: "italic",
  });
}

@Component()
class KeyframesDemo extends StatefulComponent {
  @State() fadeKey = 0;

  @Styled(AnimStyles) $a!: AnimStyles;

  render() {
    return (
      <div class={this.$a.$wrapper}>
        <div class={this.$a.$row}>
          <span class={this.$a.$label}>spin</span>
          <div class={this.$a.$spinner} />
          <code style="font-size: 0.75rem; color: #6b7280;">0.8s linear infinite</code>
        </div>

        <div class={this.$a.$row}>
          <span class={this.$a.$label}>pulse</span>
          <div class={this.$a.$pulseBadge}>
            <div class={this.$a.$dot} />
            Live
          </div>
        </div>

        <div class={this.$a.$row}>
          <span class={this.$a.$label}>bounce</span>
          <div class={this.$a.$bounceIcon}>↓</div>
        </div>

        <div class={this.$a.$row}>
          <span class={this.$a.$label}>shimmer</span>
          <div class={this.$a.$shimmerBar} />
        </div>

        <div class={this.$a.$row} style="align-items: flex-start; flex-direction: column; gap: 8px;">
          <div style="display: flex; align-items: center; gap: 12px;">
            <span class={this.$a.$label}>fade-in</span>
            <button
              class={this.$a.$btn}
              onClick={() => { this.fadeKey++; }}
            >
              Replay
            </button>
          </div>
          {() => (
            <div key={this.fadeKey} class={this.$a.$fadeCard}>
              Animates on mount using <code>keyframes('fade-in', {"{ from: {...}, to: {...} }"})</code>
            </div>
          )}
        </div>

        <p class={this.$a.$restartHint}>
          All names are content-hashed — identical animations share one injection.
        </p>
      </div>
    );
  }
}

const meta: Meta = {
  title: "Ecosystem/CSS/Keyframes",
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj;

export const KeyframesStory: Story = {
  name: "keyframes() — scoped CSS animations",
  render: () => <KeyframesDemo />,
};
