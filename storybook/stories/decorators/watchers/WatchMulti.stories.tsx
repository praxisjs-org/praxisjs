import { StatefulComponent } from "@praxisjs/core";
import { Component, State, Watch, WatchVals } from "@praxisjs/decorators";
import type { Meta, StoryObj } from "@praxisjs/storybook";

@Component()
class MultiWatchDemo extends StatefulComponent {
  @State() x = 0;
  @State() y = 0;
  @State() log: string[] = [];

  @Watch("x", "y")
  onMove(vals: WatchVals<this, "x" | "y">) {
    this.log = [`x=${vals.x}, y=${vals.y}`, ...this.log.slice(0, 5)];
  }

  render() {
    return (
      <div style="display:flex;flex-direction:column;gap:10px;font-family:sans-serif;min-width:280px">
        <h3 style="margin:0;font-size:1rem">@Watch multi-prop — coalesced callbacks</h3>
        <p style="margin:0;font-size:.85rem;color:#555">
          Both <code>x</code> and <code>y</code> change simultaneously → callback fires once with final values.
        </p>
        <div style="display:flex;gap:8px">
          <button
            style="padding:6px 14px;border-radius:6px;border:none;background:#6d5bbd;color:#fff;cursor:pointer"
            onClick={() => { this.x++; this.y++; }}
          >
            Move (+1, +1)
          </button>
          <button
            style="padding:6px 14px;border-radius:6px;border:1px solid #e5e7eb;background:#fff;cursor:pointer"
            onClick={() => { this.x += 5; this.y -= 3; }}
          >
            Jump (+5, −3)
          </button>
        </div>
        <ul style="margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:2px">
          {() => this.log.length === 0
            ? <li style="padding:6px 10px;font-size:.85rem;color:#aaa">No moves yet</li>
            : this.log.map((entry, i) => (
              <li style={`padding:5px 10px;border-radius:4px;font-size:.82rem;font-family:monospace;background:${i === 0 ? "#e8f4ff" : "#f5f5f5"}`}>
                {entry}
              </li>
            ))
          }
        </ul>
      </div>
    );
  }
}

const meta: Meta = {
  title: "Decorators/Watchers/WatchMulti",
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj;

export const WatchMultiProp: Story = {
  name: "@Watch — multi-prop coalescing",
  render: () => <MultiWatchDemo />,
};
