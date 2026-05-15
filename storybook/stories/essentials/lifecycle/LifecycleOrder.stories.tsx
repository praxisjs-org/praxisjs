import { StatefulComponent } from "@praxisjs/core";
import { Component, State } from "@praxisjs/decorators";
import type { Meta, StoryObj } from "@praxisjs/storybook";

@Component()
class BeforeMountDemo extends StatefulComponent {
  @State() log: string[] = [];
  @State() count = 0;

  onBeforeMount() {
    this.log = ["[onBeforeMount] — DOM not yet created"];
  }

  onMount() {
    this.log = [...this.log, "[onMount] — DOM is ready"];
  }

  render() {
    return (
      <div style="display:flex;flex-direction:column;gap:12px;font-family:sans-serif;min-width:300px">
        <h3 style="margin:0;font-size:1rem">Lifecycle order</h3>
        <ul style="margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:4px">
          {() => this.log.map((entry) => (
            <li style="padding:6px 10px;background:#f5f5f5;border-radius:4px;font-size:.82rem;font-family:monospace">
              {entry}
            </li>
          ))}
        </ul>
        <button
          style="padding:6px 14px;border-radius:6px;border:none;background:#6d5bbd;color:#fff;cursor:pointer;align-self:start"
          onClick={() => {
            this.count++;
            this.log = [...this.log, `[update] count → ${this.count}`];
          }}
        >
          Trigger update
        </button>
        <p style="margin:0;font-size:.78rem;color:#aaa">
          Hooks fire in order: <code>onBeforeMount</code> → render → <code>onMount</code>
        </p>
      </div>
    );
  }
}

const meta: Meta = {
  title: "Essentials/Lifecycle/LifecycleOrder",
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj;

export const LifecycleOrder: Story = {
  name: "onBeforeMount / onMount — order",
  render: () => <BeforeMountDemo />,
};
