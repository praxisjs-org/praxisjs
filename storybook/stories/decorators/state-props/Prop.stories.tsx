import { StatefulComponent } from "@praxisjs/core";
import { Component, Prop, State } from "@praxisjs/decorators";
import type { Meta, StoryObj } from "@praxisjs/storybook";

@Component()
class ButtonDemo extends StatefulComponent {
  @Prop() label = "Click me";
  @Prop() variant: "primary" | "ghost" = "primary";
  @Prop() disabled = false;

  @State() clicked = 0;

  render() {
    return (
      <div style="display:flex;flex-direction:column;gap:14px;font-family:sans-serif;min-width:260px">
        <h3 style="margin:0;font-size:1rem">@Prop — external values with defaults</h3>
        <button
          disabled={() => this.disabled}
          style={() => `padding:8px 20px;border-radius:6px;cursor:pointer;font-size:.9rem;border:${this.variant === "primary" ? "none" : "1px solid #6d5bbd"};background:${this.variant === "primary" ? "#6d5bbd" : "transparent"};color:${this.variant === "primary" ? "#fff" : "#6d5bbd"};opacity:${this.disabled ? "0.5" : "1"}`}
          onClick={() => { this.clicked++; }}
        >
          {() => this.label}
        </button>
        {() => this.clicked > 0 && (
          <p style="margin:0;font-size:.88rem;color:#555">Clicked {this.clicked}×</p>
        )}
        <p style="margin:0;font-size:.78rem;color:#aaa">
          Initialized values are defaults — the parent overrides them via props.
        </p>
      </div>
    );
  }
}

const meta: Meta = {
  title: "Decorators/State & Props/Prop",
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj;

export const PropDefaults: Story = {
  name: "@Prop — external values with defaults",
  render: () => <ButtonDemo label="Submit" variant="primary" />,
};
