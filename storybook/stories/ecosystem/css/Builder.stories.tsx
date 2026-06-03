import { StatefulComponent } from "@praxisjs/core";
import { Component, State } from "@praxisjs/decorators";
import { Stylesheet, Styled, cx } from "@praxisjs/css";
import type { Meta, StoryObj } from "@praxisjs/storybook";

/**
 * Demonstrates the fluent CSS builder (this.css({})) with pseudo-states,
 * pseudo-elements, and at-rules — all without template strings.
 */

class FormStyles extends Stylesheet {
  $group = this.css({
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  });

  $label = this.css({
    fontSize: "0.8rem",
    fontWeight: 600,
    color: "#374151",
    fontFamily: "sans-serif",
  });

  $input = this.css({
    padding: "8px 12px",
    border: "1px solid #d1d5db",
    borderRadius: "6px",
    fontSize: "0.875rem",
    fontFamily: "sans-serif",
    outline: "none",
    transition: "border-color 0.15s, box-shadow 0.15s",
    width: "100%",
    boxSizing: "border-box",
  })
    .focus({ borderColor: "#6d5bbd", boxShadow: "0 0 0 3px rgba(109, 91, 189, 0.15)" })
    .invalid({ borderColor: "#ef4444", boxShadow: "0 0 0 3px rgba(239, 68, 68, 0.15)" })
    .disabled({ opacity: 0.5, cursor: "not-allowed", background: "#f9fafb" })
    .readOnly({ background: "#f9fafb", cursor: "default" })
    .placeholder({ color: "#9ca3af" });

  $btn = this.css({
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    padding: "8px 16px",
    borderRadius: "6px",
    border: "none",
    background: "#6d5bbd",
    color: "#fff",
    fontSize: "0.875rem",
    fontWeight: 500,
    fontFamily: "sans-serif",
    cursor: "pointer",
    transition: "background 0.15s, transform 0.1s",
    position: "relative",
  })
    .hover({ background: "#5b4aa0" })
    .active({ transform: "scale(0.98)" })
    .disabled({ opacity: 0.5, cursor: "not-allowed" })
    .before({
      content: '""',
      position: "absolute",
      inset: 0,
      borderRadius: "inherit",
      background: "rgba(255,255,255,0.12)",
      opacity: 0,
      transition: "opacity 0.15s",
    })
    .on("&:hover::before", { opacity: 1 });

  $card = this.css({
    padding: "20px",
    border: "1px solid #e5e7eb",
    borderRadius: "10px",
    background: "#fff",
    fontFamily: "sans-serif",
    display: "flex",
    flexDirection: "column",
    gap: "16px",
    maxWidth: "360px",
  })
    .after({
      content: '""',
      display: "block",
      height: "3px",
      background: "linear-gradient(90deg, #6d5bbd, #a78bfa)",
      borderRadius: "0 0 10px 10px",
      marginTop: "4px",
    });

  $hint = this.css({
    fontSize: "0.75rem",
    color: "#9ca3af",
    fontFamily: "sans-serif",
    margin: "0",
  });

  $error = this.css({
    fontSize: "0.75rem",
    color: "#ef4444",
    fontFamily: "sans-serif",
    margin: "0",
  });
}

@Component()
class BuilderDemo extends StatefulComponent {
  @State() value = "";
  @State() disabled = false;
  @State() readOnly = false;

  @Styled(FormStyles) $f!: FormStyles;

  get isInvalid() { return this.value.length > 0 && this.value.length < 3; }

  render() {
    return (
      <div class={this.$f.$card}>
        <h3 style="margin: 0; font-size: 0.9rem; font-weight: 700; color: #1f1b4e;">
          CSS Builder — pseudo-states demo
        </h3>

        <div class={this.$f.$group}>
          <label class={this.$f.$label}>Username</label>
          <input
            class={() => cx(
              this.$f.$input,
              { [this.$f.$input]: true },
            )}
            placeholder="Type at least 3 chars..."
            value={() => this.value}
            disabled={() => this.disabled}
            readOnly={() => this.readOnly}
            onInput={(e: Event) => { this.value = (e.target as HTMLInputElement).value; }}
          />
          {() => this.isInvalid
            ? <p class={this.$f.$error}>Minimum 3 characters</p>
            : <p class={this.$f.$hint}>Focus shows purple ring · Invalid shows red</p>
          }
        </div>

        <div style="display: flex; gap: 8px; flex-wrap: wrap;">
          <button
            class={this.$f.$btn}
            disabled={() => this.disabled}
            onClick={() => { this.disabled = !this.disabled; }}
          >
            {() => this.disabled ? "Enable input" : "Disable input"}
          </button>
          <button
            class={this.$f.$btn}
            onClick={() => { this.readOnly = !this.readOnly; }}
            style="background: #374151;"
          >
            {() => this.readOnly ? "Make editable" : "Make read-only"}
          </button>
        </div>

        <p class={this.$f.$hint}>
          Styles defined with <code>this.css({"{}"})</code> — no template strings,
          full csstype autocomplete.
        </p>
      </div>
    );
  }
}

const meta: Meta = {
  title: "Ecosystem/CSS/Builder",
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj;

export const BuilderStory: Story = {
  name: "CSS Builder — pseudo-states & pseudo-elements",
  render: () => <BuilderDemo />,
};
