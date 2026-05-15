import { StatefulComponent } from "@praxisjs/core";
import { Component, State } from "@praxisjs/decorators";
import type { Meta, StoryObj } from "@praxisjs/storybook";

@Component()
class ReactiveVsStaticJSX extends StatefulComponent {
  @State() name = "PraxisJS";
  @State() active = false;

  render() {
    return (
      <div style="display:flex;flex-direction:column;gap:14px;font-family:sans-serif;min-width:320px">
        <h3 style="margin:0;font-size:1rem">JSX — reactive vs. static expressions</h3>
        <input
          style="padding:7px 10px;border:1px solid #ccc;border-radius:6px"
          value={() => this.name}
          onInput={(e: Event) => { this.name = (e.target as HTMLInputElement).value; }}
        />
        <div style="display:flex;flex-direction:column;gap:6px">
          <div style="display:flex;justify-content:space-between;padding:8px 12px;border-radius:6px;background:#f0fdf4;border:1px solid #bbf7d0;font-size:.88rem">
            <code>{`{() => this.name}`}</code>
            <strong style="color:#16a34a">{() => this.name}</strong>
          </div>
          <div style="display:flex;justify-content:space-between;padding:8px 12px;border-radius:6px;background:#fef2f2;border:1px solid #fecaca;font-size:.88rem">
            <code>{`{this.name}`} (static snapshot)</code>
            <strong style="color:#dc2626">{this.name}</strong>
          </div>
        </div>
        <p style="margin:0;font-size:.78rem;color:#aaa">
          <code>render()</code> runs once at mount. The green row updates live; the red row stays frozen.
        </p>
      </div>
    );
  }
}

const meta: Meta = {
  title: "Essentials/JSX/ReactiveVsStatic",
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj;

export const ReactiveVsStatic: Story = {
  name: "Reactive vs. static expressions",
  render: () => <ReactiveVsStaticJSX />,
};
