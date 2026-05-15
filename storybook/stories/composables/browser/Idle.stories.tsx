import { StatefulComponent } from "@praxisjs/core";
import { Component, Compose } from "@praxisjs/decorators";
import { Idle } from "@praxisjs/composables";
import type { Meta, StoryObj } from "@praxisjs/storybook";

@Component()
class IdleDemo extends StatefulComponent {
  @Compose(Idle, 5000)
  activity!: Idle;

  render() {
    return (
      <div style="display:flex;flex-direction:column;gap:14px;font-family:sans-serif;min-width:280px">
        <h3 style="margin:0;font-size:1rem">Idle — inactivity detection (5s)</h3>
        <div style={() => `padding:20px;border-radius:10px;text-align:center;transition:all .4s;background:${this.activity.idle ? "#fef9c3" : "#f0fdf4"};border:1px solid ${this.activity.idle ? "#fde047" : "#bbf7d0"}`}>
          <p style="margin:0;font-size:2rem">{() => this.activity.idle ? "💤" : "👋"}</p>
          <p style={() => `margin:6px 0 0;font-size:.9rem;font-weight:700;color:${this.activity.idle ? "#713f12" : "#166534"}`}>
            {() => this.activity.idle ? "Idle — no activity for 5s" : "Active"}
          </p>
        </div>
        <p style="margin:0;font-size:.78rem;color:#aaa">
          Stop moving the mouse and pressing keys — after 5s of inactivity,
          <code>activity.idle</code> becomes <code>true</code>.
          Monitors <code>mousemove</code>, <code>keydown</code>, <code>click</code>, <code>scroll</code>, and <code>touchstart</code>.
        </p>
      </div>
    );
  }
}

const meta: Meta = {
  title: "Composables/Browser/Idle",
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj;

export const IdleStory: Story = {
  name: "Idle — inactivity detection",
  render: () => <IdleDemo />,
};
