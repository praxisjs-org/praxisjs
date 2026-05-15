import { StatefulComponent } from "@praxisjs/core";
import { Component, Prop, State } from "@praxisjs/decorators";
import type { Meta, StoryObj } from "@praxisjs/storybook";

@Component()
class Greeting extends StatefulComponent {
  @Prop() name = "World";
  @State() clicks = 0;

  render() {
    return (
      <div style="display:flex;flex-direction:column;gap:14px;font-family:sans-serif;min-width:260px">
        <h3 style="margin:0;font-size:1rem">StatefulComponent</h3>
        <p style="margin:0;font-size:1.2rem;font-weight:600">
          Hello, {() => this.name}!
        </p>
        <div style="display:flex;align-items:center;gap:10px">
          <button
            style="padding:6px 16px;border-radius:6px;border:none;background:#6d5bbd;color:#fff;cursor:pointer"
            onClick={() => { this.clicks++; }}
          >
            Click me
          </button>
          <span style="font-size:.9rem;color:#555">
            {() => this.clicks === 0 ? "Not clicked yet" : `Clicked ${this.clicks}×`}
          </span>
        </div>
        <p style="margin:0;font-size:.78rem;color:#aaa">
          <code>@State()</code> tracks internal mutable state. <code>@Prop()</code> receives external values.
        </p>
      </div>
    );
  }
}

const meta: Meta = {
  title: "Essentials/Components/StatefulComponent",
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj;

export const Stateful: Story = {
  name: "StatefulComponent",
  render: () => <Greeting name="PraxisJS" />,
};
