import { StatefulComponent } from "@praxisjs/core";
import { Component, State, Computed } from "@praxisjs/decorators";
import type { Meta, StoryObj } from "@praxisjs/storybook";

@Component()
class ComputedDemo extends StatefulComponent {
  @State() first = "Jane";
  @State() last = "Doe";

  @Computed()
  get fullName() {
    return `${this.first} ${this.last}`;
  }

  render() {
    return (
      <div style="display:flex;flex-direction:column;gap:14px;font-family:sans-serif;min-width:320px">
        <h3 style="margin:0;font-size:1rem">@Computed — cached derived state</h3>
        <div style="display:flex;gap:8px">
          <input
            style="flex:1;padding:6px 10px;border:1px solid #ccc;border-radius:6px"
            placeholder="First"
            value={() => this.first}
            onInput={(e: Event) => { this.first = (e.target as HTMLInputElement).value; }}
          />
          <input
            style="flex:1;padding:6px 10px;border:1px solid #ccc;border-radius:6px"
            placeholder="Last"
            value={() => this.last}
            onInput={(e: Event) => { this.last = (e.target as HTMLInputElement).value; }}
          />
        </div>
        <p style="margin:0;font-size:1.1rem;font-weight:600;color:#6d5bbd">
          {() => this.fullName}
        </p>
        <p style="margin:0;font-size:.82rem;color:#666">
          When both <code>first</code> and <code>last</code> change in the same tick,
          subscribers are notified <em>once</em> with the final derived value — never an intermediate.
        </p>
      </div>
    );
  }
}

const meta: Meta = {
  title: "Essentials/Reactivity/Computed",
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj;

export const ComputedValues: Story = {
  name: "@Computed — cached derived values",
  render: () => <ComputedDemo />,
};
