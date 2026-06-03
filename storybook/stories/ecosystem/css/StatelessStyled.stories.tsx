import { StatelessComponent } from "@praxisjs/core";
import { Component } from "@praxisjs/decorators";
import { Stylesheet, Styled, cx } from "@praxisjs/css";
import type { Meta, StoryObj } from "@praxisjs/storybook";

/**
 * @Styled with a plain Stylesheet (no @Param()) can be applied to any component,
 * including StatelessComponent. TypeScript enforces this — using ReactiveStylesheet
 * with StatelessComponent is a compile-time error.
 */

class BadgeStyles extends Stylesheet {
  $root = this.css({
    display: "inline-flex", alignItems: "center", gap: "4px",
    padding: "2px 10px", borderRadius: "99px",
    fontSize: "0.75rem", fontWeight: 500,
    fontFamily: "sans-serif", lineHeight: 1.5,
  });
  $info    = this.css({ background: "#eff6ff", color: "#1d4ed8" });
  $success = this.css({ background: "#f0fdf4", color: "#15803d" });
  $warning = this.css({ background: "#fffbeb", color: "#b45309" });
  $error   = this.css({ background: "#fef2f2", color: "#b91c1c" });
}

type BadgeVariant = "info" | "success" | "warning" | "error";

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
}

@Component()
class Badge extends StatelessComponent<BadgeProps> {
  @Styled(BadgeStyles) $badge!: BadgeStyles;

  render() {
    const variant = this.props.variant ?? "info";
    const variantClass = this.$badge[`$${variant}` as keyof BadgeStyles] as string;
    return (
      <span class={cx(this.$badge.$root, variantClass)}>
        {this.props.label}
      </span>
    );
  }
}

const meta: Meta = {
  title: "Ecosystem/CSS/StatelessStyled",
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj;

export const StatelessStyledStory: Story = {
  name: "Styled on StatelessComponent — static CSS only",
  render: () => (
    <div style="display: flex; gap: 8px; flex-wrap: wrap; padding: 8px; font-family: sans-serif;">
      <Badge label="Info" variant="info" />
      <Badge label="Success" variant="success" />
      <Badge label="Warning" variant="warning" />
      <Badge label="Error" variant="error" />
    </div>
  ),
};
