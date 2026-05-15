import { StatefulComponent } from "@praxisjs/core";
import { Component, State } from "@praxisjs/decorators";
import type { Meta, StoryObj } from "@praxisjs/storybook";

@Component()
class StateDemo extends StatefulComponent {
  @State() firstName = "Jane";
  @State() lastName = "Doe";

  render() {
    return (
      <div style="display:flex;flex-direction:column;gap:12px;font-family:sans-serif;min-width:280px">
        <h3 style="margin:0;font-size:1rem">@State — fine-grained updates</h3>
        <div style="display:flex;gap:8px">
          <input
            style="flex:1;padding:6px 10px;border:1px solid #ccc;border-radius:6px"
            placeholder="First name"
            value={() => this.firstName}
            onInput={(e: Event) => { this.firstName = (e.target as HTMLInputElement).value; }}
          />
          <input
            style="flex:1;padding:6px 10px;border:1px solid #ccc;border-radius:6px"
            placeholder="Last name"
            value={() => this.lastName}
            onInput={(e: Event) => { this.lastName = (e.target as HTMLInputElement).value; }}
          />
        </div>
        <p style="margin:0;font-size:1.15rem;font-weight:600">
          Hello, {() => this.firstName} {() => this.lastName}!
        </p>
        <p style="margin:0;font-size:.78rem;color:#aaa">
          Each node updates independently — changing first name does not touch the last name node.
        </p>
      </div>
    );
  }
}

const meta: Meta = {
  title: "Decorators/State & Props/State",
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj;

export const StateBasic: Story = {
  name: "@State — fine-grained updates",
  render: () => <StateDemo />,
};
