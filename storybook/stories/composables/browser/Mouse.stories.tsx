import { StatefulComponent } from "@praxisjs/core";
import { Component, Compose } from "@praxisjs/decorators";
import { Mouse } from "@praxisjs/composables";
import type { Meta, StoryObj } from "@praxisjs/storybook";

@Component()
class MouseDemo extends StatefulComponent {
  @Compose(Mouse)
  mouse!: Mouse;

  render() {
    return (
      <div style="display:flex;flex-direction:column;gap:14px;font-family:sans-serif;min-width:280px">
        <h3 style="margin:0;font-size:1rem">Mouse — reactive cursor position</h3>
        <div style="display:flex;gap:12px">
          <div style="flex:1;padding:12px;border:1px solid #e5e7eb;border-radius:8px;text-align:center">
            <p style="margin:0;font-size:1.8rem;font-weight:700;color:#6d5bbd;font-variant-numeric:tabular-nums">
              {() => this.mouse.x}
            </p>
            <p style="margin:4px 0 0;font-size:.75rem;color:#9ca3af">x</p>
          </div>
          <div style="flex:1;padding:12px;border:1px solid #e5e7eb;border-radius:8px;text-align:center">
            <p style="margin:0;font-size:1.8rem;font-weight:700;color:#6d5bbd;font-variant-numeric:tabular-nums">
              {() => this.mouse.y}
            </p>
            <p style="margin:4px 0 0;font-size:.75rem;color:#9ca3af">y</p>
          </div>
        </div>
        <p style="margin:0;font-size:.78rem;color:#aaa">
          Move the cursor anywhere in the window — the position updates reactively via <code>mousemove</code>.
        </p>
      </div>
    );
  }
}

const meta: Meta = {
  title: "Composables/Browser/Mouse",
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj;

export const MouseStory: Story = {
  name: "Mouse — cursor position",
  render: () => <MouseDemo />,
};
