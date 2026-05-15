import { StatefulComponent } from "@praxisjs/core";
import { Component, State } from "@praxisjs/decorators";
import { Spring } from "@praxisjs/motion";
import type { Meta, StoryObj } from "@praxisjs/storybook";

@Component()
class SpringDemo extends StatefulComponent {
  @Spring({ stiffness: 0.15, damping: 0.75 })
  x = 0;

  @Spring({ stiffness: 0.15, damping: 0.75 })
  y = 0;

  @Spring({ stiffness: 0.3, damping: 0.6 })
  scale = 1;

  @State() stiffness = 0.15;
  @State() damping = 0.75;

  handleClick(e: MouseEvent) {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    this.x = e.clientX - rect.left - rect.width / 2;
    this.y = e.clientY - rect.top - rect.height / 2;
    this.scale = 1.3;
    setTimeout(() => { this.scale = 1; }, 200);
  }

  render() {
    return (
      <div style="display:flex;flex-direction:column;gap:16px;font-family:sans-serif;min-width:300px">
        <h3 style="margin:0;font-size:1rem">@Spring — physics-based animation</h3>

        <div
          style="height:180px;border:2px dashed #e5e7eb;border-radius:10px;background:#fafafa;position:relative;overflow:hidden;cursor:crosshair"
          onClick={(e: MouseEvent) => { this.handleClick(e); }}
        >
          <span style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);font-size:.78rem;color:#d1d5db;pointer-events:none;user-select:none">
            Click anywhere
          </span>
          <div
            style={() => `position:absolute;top:50%;left:50%;width:44px;height:44px;border-radius:50%;background:#6d5bbd;transform:translate(calc(-50% + ${this.x}px), calc(-50% + ${this.y}px)) scale(${this.scale});pointer-events:none`}
          />
        </div>

        <div style="display:flex;flex-direction:column;gap:8px">
          <div style="display:flex;gap:14px">
            {[
              { label: "Snappy", stiffness: 0.4, damping: 0.85 },
              { label: "Bouncy", stiffness: 0.12, damping: 0.5 },
              { label: "Wobbly", stiffness: 0.08, damping: 0.35 },
            ].map((preset) => (
              <button
                key={preset.label}
                style="flex:1;padding:6px;border-radius:5px;border:1px solid #e5e7eb;background:#fff;cursor:pointer;font-size:.78rem"
                onClick={() => {
                  this.scale = 1.5;
                  setTimeout(() => { this.scale = 1; }, 150);
                }}
              >
                {preset.label}
              </button>
            ))}
          </div>
          <p style="margin:0;font-size:.75rem;color:#aaa">
            Note: <code>stiffness</code> and <code>damping</code> are set at decoration time.
            Click the ball area to see spring physics in action.
          </p>
        </div>

        <p style="margin:0;font-size:.78rem;color:#aaa">
          <code>@Spring()</code> uses a physics simulation per frame — the value overshoots
          and settles naturally. Default: stiffness=0.15, damping=0.8.
        </p>
      </div>
    );
  }
}

const meta: Meta = {
  title: "Ecosystem/Motion/Spring",
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj;

export const SpringStory: Story = {
  name: "@Spring — physics-based animation",
  render: () => <SpringDemo />,
};
