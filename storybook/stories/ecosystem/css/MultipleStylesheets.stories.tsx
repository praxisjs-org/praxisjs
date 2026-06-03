import { StatefulComponent } from "@praxisjs/core";
import { Component, Prop, State } from "@praxisjs/decorators";
import { Stylesheet, Styled, cx } from "@praxisjs/css";
import type { Meta, StoryObj } from "@praxisjs/storybook";

/**
 * Demonstrates multiple @Styled fields in one component.
 * Each Stylesheet injects its own scoped <style> element, reference-counted.
 */

// ─── Layout stylesheet ────────────────────────────────────────────────────────

class LayoutStyles extends Stylesheet {
  $card = this.css({
    display: "flex",
    flexDirection: "column",
    border: "1px solid #e5e7eb",
    borderRadius: "12px",
    overflow: "hidden",
    background: "#fff",
    maxWidth: "360px",
    fontFamily: "sans-serif",
    transition: "box-shadow 0.2s, transform 0.2s",
  })
    .hover({ boxShadow: "0 4px 20px rgba(0,0,0,0.08)", transform: "translateY(-1px)" });

  $header = this.css({
    padding: "16px 20px 12px",
    borderBottom: "1px solid #f3f4f6",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  });

  $body = this.css({
    padding: "16px 20px",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    flex: "1",
  });

  $footer = this.css({
    padding: "12px 20px",
    borderTop: "1px solid #f3f4f6",
    display: "flex",
    gap: "8px",
    justifyContent: "flex-end",
  });
}

// ─── Typography stylesheet ────────────────────────────────────────────────────

class TypographyStyles extends Stylesheet {
  $heading = this.css({ fontSize: "0.9rem", fontWeight: 700, color: "#111827", margin: "0", lineHeight: 1.3 });
  $subheading = this.css({ fontSize: "0.75rem", color: "#6b7280", margin: "0" });
  $body = this.css({ fontSize: "0.85rem", color: "#374151", lineHeight: 1.6, margin: "0" });
  $caption = this.css({ fontSize: "0.72rem", color: "#9ca3af", margin: "0" });
  $badge = this.css({ display: "inline-flex", alignItems: "center", padding: "2px 8px", borderRadius: "99px", fontSize: "0.7rem", fontWeight: 600 });
  $badgeGreen = this.css({ background: "#d1fae5", color: "#065f46" });
  $badgeBlue  = this.css({ background: "#dbeafe", color: "#1e40af" });
  $badgeGray  = this.css({ background: "#f3f4f6", color: "#4b5563" });
}

// ─── Button stylesheet ────────────────────────────────────────────────────────

class ButtonStyles extends Stylesheet {
  $primary = this.css({
    padding: "6px 14px", borderRadius: "6px", border: "none",
    background: "#6d5bbd", color: "#fff", fontSize: "0.78rem",
    fontWeight: 500, cursor: "pointer", fontFamily: "sans-serif",
  })
    .hover({ background: "#5b4aa0" })
    .active({ transform: "scale(0.97)" });

  $ghost = this.css({
    padding: "6px 14px", borderRadius: "6px", border: "1px solid #e5e7eb",
    background: "transparent", color: "#374151", fontSize: "0.78rem",
    cursor: "pointer", fontFamily: "sans-serif",
  })
    .hover({ background: "#f9fafb" });
}

// ─── Component ────────────────────────────────────────────────────────────────

type Status = "active" | "pending" | "inactive";

@Component()
class ArticleCard extends StatefulComponent {
  @Prop() title = "";
  @Prop() author = "";
  @Prop() preview = "";
  @Prop() status: Status = "active";
  @Prop() date = "";

  @State() bookmarked = false;

  @Styled(LayoutStyles)     $layout!: LayoutStyles;
  @Styled(TypographyStyles) $type!: TypographyStyles;
  @Styled(ButtonStyles)     $btn!: ButtonStyles;

  get statusClass(): string {
    const map: Record<Status, string> = {
      active:   this.$type.$badgeGreen,
      pending:  this.$type.$badgeBlue,
      inactive: this.$type.$badgeGray,
    };
    return map[this.status];
  }

  render() {
    return (
      <article class={this.$layout.$card}>
        <header class={this.$layout.$header}>
          <div>
            <h3 class={this.$type.$heading}>{() => this.title}</h3>
            <p class={this.$type.$subheading}>{() => `${this.author} · ${this.date}`}</p>
          </div>
          <span class={() => cx(this.$type.$badge, this.statusClass)}>
            {() => this.status}
          </span>
        </header>

        <div class={this.$layout.$body}>
          <p class={this.$type.$body}>{() => this.preview}</p>
          <p class={this.$type.$caption}>
            Three independent stylesheets injected via three separate{" "}
            <code>@Styled</code> fields — each with its own{" "}
            <code>&lt;style&gt;</code> element, reference-counted.
          </p>
        </div>

        <footer class={this.$layout.$footer}>
          <button
            class={this.$btn.$ghost}
            onClick={() => { this.bookmarked = !this.bookmarked; }}
          >
            {() => this.bookmarked ? "★ Saved" : "☆ Save"}
          </button>
          <button class={this.$btn.$primary}>Read more</button>
        </footer>
      </article>
    );
  }
}

const meta: Meta = {
  title: "Ecosystem/CSS/MultipleStylesheets",
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj;

export const MultipleStylesheetsStory: Story = {
  name: "Multiple @Styled fields — independent stylesheets",
  render: () => (
    <div style="display: flex; flex-direction: column; gap: 16px; padding: 8px;">
      <ArticleCard
        title="Signals vs Observables — a deep dive"
        author="Ana Lima"
        date="Jun 12"
        status="active"
        preview="Signals offer a simpler mental model for reactive state. Here's how they compare to RxJS observables in real-world scenarios."
      />
      <ArticleCard
        title="Building accessible form components"
        author="Pedro Santos"
        date="Jun 8"
        status="pending"
        preview="Accessible forms require more than ARIA labels. Learn how to handle focus, validation, and keyboard navigation properly."
      />
    </div>
  ),
};
